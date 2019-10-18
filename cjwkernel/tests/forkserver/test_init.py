import contextlib
import marshal
import os
import shutil
import stat
from textwrap import dedent
from typing import Any, ContextManager, FrozenSet, List, Tuple
import unittest
from cjwkernel import forkserver
from cjwkernel.tests.util import tempfile_context


def module_main(indented_code: str) -> None:
    code = dedent(indented_code)
    code_obj = compile(code, "<module string>", "exec", dont_inherit=True, optimize=0)
    # Exec in global scope, so imports go to globals, not locals
    exec(code_obj, globals(), globals())


@contextlib.contextmanager
def _spawned_module_context(
    server: forkserver.Forkserver,
    args: List[Any] = [],
    skip_sandbox_except: FrozenSet[str] = frozenset(),
) -> ContextManager[forkserver.ModuleProcess]:
    subprocess = server.spawn_module(
        "forkserver-test", args, skip_sandbox_except=skip_sandbox_except
    )
    try:
        yield subprocess
    finally:
        try:
            subprocess.stdout.read()
        except ValueError:
            pass  # stdout already closed
        try:
            subprocess.stderr.read()
        except ValueError:
            pass  # stderr already closed
        try:
            subprocess.kill()
        except ProcessLookupError:
            pass
        try:
            subprocess.wait(0)
        except ChildProcessError:
            pass


class ForkserverTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._forkserver = forkserver.Forkserver(
            module_main="cjwkernel.tests.forkserver.test_init.module_main"
        )

    @classmethod
    def tearDownClass(cls):
        cls._forkserver.close()
        del cls._forkserver

    def _spawn_and_communicate(
        self, indented_code: str, skip_sandbox_except: FrozenSet[str] = frozenset()
    ) -> Tuple[int, bytes, bytes]:
        """
        Spawn, execute `indented_code`, and return (exitcode, stdout, stderr).

        This will never error.
        """
        with _spawned_module_context(
            self._forkserver,
            args=[indented_code],
            skip_sandbox_except=skip_sandbox_except,
        ) as subprocess:
            stdout = subprocess.stdout.read()
            stderr = subprocess.stderr.read()
            _, status = subprocess.wait(0)
            if os.WIFSIGNALED(status):
                exitcode = -os.WTERMSIG(status)
            elif os.WIFEXITED(status):
                exitcode = os.WEXITSTATUS(status)
            else:
                raise OSError("Unexpected status: %d" % status)
            return exitcode, stdout, stderr

    def _spawn_and_communicate_or_raise(
        self, indented_code: str, skip_sandbox_except: FrozenSet[str] = frozenset()
    ) -> None:
        """
        Like _spawn_and_communicate(), but raise if exit code is not 0.
        """
        exitcode, stdout, stderr = self._spawn_and_communicate(
            indented_code, skip_sandbox_except=skip_sandbox_except
        )
        self.assertEqual(exitcode, 0, "Exit code %d: %s" % (exitcode, stderr))
        self.assertEqual(stderr, b"", "Unexpected stderr: %r" % stderr)
        self.assertEqual(stdout, b"", "Unexpected stdout: %r" % stdout)

    def test_stdout_stderr(self):
        exitcode, stdout, stderr = self._spawn_and_communicate(
            r"""
            import os
            import sys
            print("stdout")
            print("stderr", file=sys.stderr)
            sys.__stdout__.write("__stdout__\n")
            sys.__stderr__.write("__stderr__\n")
            os.write(1, b"fd1\n")
            os.write(2, b"fd2\n")
            """
        )
        self.assertEqual(exitcode, 0)
        self.assertEqual(stdout, b"stdout\n__stdout__\nfd1\n")
        self.assertEqual(stderr, b"stderr\n__stderr__\nfd2\n")

    def test_exception_goes_to_stderr(self):
        exitcode, stdout, stderr = self._spawn_and_communicate("import abaskjdgh")
        self.assertEqual(exitcode, 1)
        self.assertEqual(stdout, b"")
        self.assertRegex(stderr, b"ModuleNotFoundError")

    def test_SECURITY_sock_and_stdin_and_other_fds_are_closed(self):
        # The user cannot access pipes or files outside its sandbox (aside from
        # stdout+stderr, which the parent process knows are untrusted).
        self._spawn_and_communicate_or_raise(
            r"""
            import os
            for badfd in [0] + list(range(3, 20)):
                try:
                    os.write(badfd, b"x")
                    raise RuntimeError("fd %d is unexpectedly open" % badfd)
                except OSError as err:
                    assert err.args[0] == 9  # Bad file descriptor
            """
        )

    def test_SECURITY_no_capabilities(self):
        # Even if the user becomes root, the Linux "capabilities" system
        # restricts syscalls that might leak outside the container.
        self._spawn_and_communicate_or_raise(
            r"""
            import ctypes
            libc = ctypes.CDLL("libc.so.6", use_errno=True)
            PR_CAP_AMBIENT = 47
            PR_CAP_AMBIENT_IS_SET = 1
            CAP_SYS_CHROOT = 18  # just one example
            EPERM = 1

            # Test a capability isn't set
            assert (
                libc.prctl(PR_CAP_AMBIENT, PR_CAP_AMBIENT_IS_SET, CAP_SYS_CHROOT, 0, 0)
            ) == 0
            # Test we can't actually *use* a capability -- chroot, for example
            assert libc.chroot("/sys") == -1
            assert ctypes.get_errno() == EPERM
            """,
            skip_sandbox_except=frozenset(["drop_capabilities"]),
        )

    def test_SECURITY_prevent_writing_uid_map(self):
        self._spawn_and_communicate_or_raise(
            r"""
            from pathlib import Path

            def assert_write_fails(path: str, text: str):
                try:
                    Path(path).write_text(text)
                except PermissionError:
                    pass
                else:
                    assert False, "Write to %s should have failed" % path

            assert_write_fails("/proc/self/uid_map", "0 0 65536")
            assert_write_fails("/proc/self/setgroups", "allow")
            assert_write_fails("/proc/self/gid_map", "0 0 65536")
            """,
            # There's no way to disable this security feature. But for testing
            # we must _disable_ setuid, drop_capabilities and chroot; so write
            # a dummy skip_sandbox_except to accomplish that.
            skip_sandbox_except=frozenset(["skip_all_optional_sandboxing"]),
        )

    # def test_SECURITY_setuid(self):
    #     # The user is not root
    #     self._spawn_and_communicate_or_raise(
    #         r"""
    #         import os
    #         assert os.getuid() == 1000
    #         assert os.getgid() == 1000
    #         # Assert the script can't setuid() to anything else. In other
    #         # words: test we really used setresuid(), not setuid() -- because
    #         # setuid() lets you un-setuid() later.
    #         #
    #         # This relies on the "drop_capabilities" sandboxing feature.
    #         # (Otherwise, the caller would have CAP_SETUID.)
    #         try:
    #             os.setuid(0); assert False, "gah, how did we setuid to 0?"
    #         except PermissionError:
    #             pass  # good
    #         """,
    #         skip_sandbox_except=frozenset(["setuid", "drop_capabilities"]),
    #     )

    # def test_SECURITY_no_new_privs(self):
    #     # The user cannot use a setuid program to become root
    #     assert os.getuid() == 0  # so our test suite can actually chmod
    #     # Build the tempfile in the root filesystem, where there's no
    #     # "nosetuid" mount option
    #     with tempfile_context(prefix="print-id", suffix=".bin", dir="/") as prog:
    #         # We can't test with a _script_: we need to test with a _binary_.
    #         # (Scripts invoke the interpreter, which is not setuid.)
    #         #
    #         # The "id" binary is perfect: it prints all three uids and gids if
    #         # they differ from one another.
    #         shutil.copy("/usr/bin/id", prog)
    #         os.chown(str(prog), 0, 0)  # make doubly sure root owns it
    #         os.chmod(str(prog), 0o755 | stat.S_ISUID | stat.S_ISGID)
    #         os.system("ls " + str(prog))

    #         exitcode, stdout, stderr = self._spawn_and_communicate(
    #             r"""
    #             import os
    #             os.execv("%s", ["%s"])
    #             """
    #             % (str(prog), str(prog)),
    #             # XXX SECURITY [2019-10-11] This test should fail if we comment
    #             # out "no_new_privs". Why doesn't it? (It looks like there's
    #             # some other security layer we don't know of....)
    #             skip_sandbox_except=frozenset(["setuid", "no_new_privs"]),
    #         )
    #         self.assertEqual(exitcode, 0)
    #         self.assertEqual(stdout, b"uid=1000 gid=1000 groups=1000\n")
    #         self.assertEqual(stderr, b"")
