"""
Static Code Analyzer
Uses Python's ast module + pattern matching to detect real bugs in code.
Returns structured JSON output compatible with the existing API format.
"""

import ast
import re
import sys


class StaticAnalyzer:
    """AST-based static code analyzer for Python code."""

    def __init__(self):
        self.bugs = []
        self.fixes = []

    def analyze(self, code: str) -> dict:
        """Run all analysis checks on a code snippet. Returns bugs and fixes."""
        self.bugs = []
        self.fixes = []

        # 1. Check for syntax errors
        self._check_syntax(code)

        # If code doesn't even parse, return early
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return self._result()

        # 2. AST-based checks
        self._check_eval_exec(tree, code)
        self._check_bare_except(tree, code)
        self._check_mutable_defaults(tree, code)
        self._check_unused_imports(tree, code)
        self._check_missing_return(tree, code)

        # 3. Pattern-based checks (regex on source)
        self._check_hardcoded_secrets(code)
        self._check_sql_injection(code)
        self._check_string_concat_loop(code)
        self._check_division_safety(code)
        self._check_file_not_closed(code)
        self._check_print_debugging(code)

        return self._result()

    def _result(self):
        return {
            'bugs': self.bugs,
            'fixes': self.fixes
        }

    def _add_bug(self, bug_type, description, line_numbers=None):
        self.bugs.append({
            'bugType': bug_type,
            'description': description,
            'lineNumbers': line_numbers or []
        })

    def _add_fix(self, original, fixed, explanation):
        self.fixes.append({
            'originalCode': original,
            'fixedCode': fixed,
            'explanation': explanation
        })

    # ---------------------------------------------------------------
    # Check 1: Syntax errors
    # ---------------------------------------------------------------
    def _check_syntax(self, code):
        try:
            ast.parse(code)
        except SyntaxError as e:
            self._add_bug(
                'Syntax',
                f"Syntax error at line {e.lineno}: {e.msg}",
                [e.lineno] if e.lineno else []
            )
            if e.text:
                self._add_fix(
                    e.text.strip(),
                    f"# Fix the syntax error: {e.msg}",
                    f"Python parser found a syntax error: {e.msg}"
                )

    # ---------------------------------------------------------------
    # Check 2: eval() / exec() usage
    # ---------------------------------------------------------------
    def _check_eval_exec(self, tree, code):
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func_name = None
                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                elif isinstance(node.func, ast.Attribute):
                    func_name = node.func.attr

                if func_name in ('eval', 'exec'):
                    self._add_bug(
                        'Security',
                        f"Dangerous use of {func_name}() — can execute arbitrary code. "
                        f"Avoid using {func_name}() on user-supplied input.",
                        [node.lineno]
                    )
                    self._add_fix(
                        f"{func_name}(user_input)",
                        f"ast.literal_eval(user_input)  # Only evaluates literals safely"
                        if func_name == 'eval' else
                        f"# Replace exec() with a safe alternative like a command dispatcher pattern",
                        f"{func_name}() allows arbitrary code execution. Use ast.literal_eval() for safe evaluation of literals."
                    )

    # ---------------------------------------------------------------
    # Check 3: Bare except clauses
    # ---------------------------------------------------------------
    def _check_bare_except(self, tree, code):
        for node in ast.walk(tree):
            if isinstance(node, ast.ExceptHandler) and node.type is None:
                self._add_bug(
                    'Style',
                    "Bare 'except:' catches ALL exceptions including SystemExit and KeyboardInterrupt. "
                    "Always specify the exception type.",
                    [node.lineno]
                )
                self._add_fix(
                    "except:",
                    "except Exception as e:",
                    "Catch specific exceptions instead of using bare except. "
                    "This prevents accidentally swallowing critical system signals."
                )

    # ---------------------------------------------------------------
    # Check 4: Mutable default arguments
    # ---------------------------------------------------------------
    def _check_mutable_defaults(self, tree, code):
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for default in node.args.defaults + node.args.kw_defaults:
                    if default is not None and isinstance(default, (ast.List, ast.Dict, ast.Set)):
                        self._add_bug(
                            'Logical',
                            f"Mutable default argument in function '{node.name}'. "
                            f"Default mutable objects are shared across all calls.",
                            [node.lineno]
                        )
                        self._add_fix(
                            f"def {node.name}(..., arg=[]):",
                            f"def {node.name}(..., arg=None):\n    if arg is None:\n        arg = []",
                            "Mutable defaults are shared between function calls. Use None and create a new object inside."
                        )

    # ---------------------------------------------------------------
    # Check 5: Unused imports
    # ---------------------------------------------------------------
    def _check_unused_imports(self, tree, code):
        # Collect all imported names
        imported = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imported[name] = node.lineno
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imported[name] = node.lineno

        # Check which names are actually used
        used_names = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Name):
                used_names.add(node.id)
            elif isinstance(node, ast.Attribute):
                if isinstance(node.value, ast.Name):
                    used_names.add(node.value.id)

        for name, lineno in imported.items():
            if name not in used_names:
                self._add_bug(
                    'Style',
                    f"Import '{name}' is imported but never used.",
                    [lineno]
                )

    # ---------------------------------------------------------------
    # Check 6: Functions without return in all branches
    # ---------------------------------------------------------------
    def _check_missing_return(self, tree, code):
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                has_if = any(isinstance(n, ast.If) for n in ast.walk(node))
                returns = [n for n in ast.walk(node) if isinstance(n, ast.Return) and n.value is not None]
                if has_if and len(returns) == 1:
                    self._add_bug(
                        'Logical',
                        f"Function '{node.name}' may not return a value in all code paths. "
                        f"One branch has a return but the other doesn't.",
                        [node.lineno]
                    )
                    self._add_fix(
                        f"def {node.name}(...):\n    if condition:\n        return value",
                        f"def {node.name}(...):\n    if condition:\n        return value\n    return default_value  # Handle all paths",
                        "Functions should return a value in all code paths to avoid implicit None returns."
                    )

    # ---------------------------------------------------------------
    # Pattern-based checks (regex)
    # ---------------------------------------------------------------
    def _check_hardcoded_secrets(self, code):
        patterns = [
            (r'(?i)(password|passwd|pwd)\s*=\s*["\'][^"\']+["\']', 'password'),
            (r'(?i)(api_key|apikey|secret)\s*=\s*["\'][^"\']+["\']', 'API key/secret'),
            (r'(?i)(token)\s*=\s*["\'][a-zA-Z0-9]{10,}["\']', 'token'),
        ]
        for pattern, secret_type in patterns:
            for match in re.finditer(pattern, code):
                line_no = code[:match.start()].count('\n') + 1
                self._add_bug(
                    'Security',
                    f"Hardcoded {secret_type} found in source code. Use environment variables instead.",
                    [line_no]
                )
                self._add_fix(
                    match.group(0),
                    f"# Use: os.getenv('{secret_type.upper().replace(' ', '_')}')",
                    "Never hardcode secrets in source. Use environment variables or a .env file."
                )

    def _check_sql_injection(self, code):
        sql_pattern = r'["\'].*?(SELECT|INSERT|UPDATE|DELETE).*?\+\s*\w+'
        for match in re.finditer(sql_pattern, code, re.IGNORECASE):
            line_no = code[:match.start()].count('\n') + 1
            self._add_bug(
                'Security',
                "Potential SQL injection: query built with string concatenation.",
                [line_no]
            )
            self._add_fix(
                'query = "SELECT * FROM users WHERE name = \'" + username + "\'"',
                'cursor.execute("SELECT * FROM users WHERE name = %s", (username,))',
                "Use parameterized queries to prevent SQL injection attacks."
            )

    def _check_string_concat_loop(self, code):
        lines = code.split('\n')
        in_loop = False
        loop_start = 0
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith(('for ', 'while ')):
                in_loop = True
                loop_start = i
            if in_loop and '+=' in line and ('str(' in line or '+ "' in line or "+ '" in line):
                self._add_bug(
                    'Performance',
                    "String concatenation with += inside a loop is O(n²). Use list append + join.",
                    [i]
                )
                self._add_fix(
                    'result += str(item) + "\\n"',
                    'parts.append(str(item))\nresult = "\\n".join(parts)',
                    "String concatenation in loops creates new string objects each iteration. Use a list and join()."
                )
                in_loop = False

    def _check_division_safety(self, code):
        # Look for division that might be zero
        div_pattern = r'(\w+)\s*/\s*(len\(\w+\)|\w+)'
        for match in re.finditer(div_pattern, code):
            denominator = match.group(2)
            if denominator.startswith('len(') or denominator in ('total', 'count', 'n', 'size', 'whole'):
                line_no = code[:match.start()].count('\n') + 1
                self._add_bug(
                    'Logical',
                    f"Potential division by zero: {denominator} could be 0.",
                    [line_no]
                )
                self._add_fix(
                    match.group(0),
                    f"{match.group(1)} / {denominator} if {denominator} else 0",
                    "Always guard against division by zero with a conditional check."
                )

    def _check_file_not_closed(self, code):
        # open() without 'with' statement
        if 'open(' in code and 'with ' not in code:
            for i, line in enumerate(code.split('\n'), 1):
                if 'open(' in line and 'with ' not in line:
                    self._add_bug(
                        'Performance',
                        "File opened without 'with' statement — may not be properly closed.",
                        [i]
                    )
                    self._add_fix(
                        "f = open('file.txt')",
                        "with open('file.txt') as f:\n    data = f.read()",
                        "Use 'with' statement (context manager) to ensure files are always properly closed."
                    )
                    break

    def _check_print_debugging(self, code):
        print_count = code.count('print(')
        if print_count >= 5:
            self._add_bug(
                'Style',
                f"Found {print_count} print() calls — likely debug statements left in code. Consider using logging module.",
                []
            )
            self._add_fix(
                "print(f'Debug: {variable}')",
                "import logging\nlogger = logging.getLogger(__name__)\nlogger.debug(f'Debug: {variable}')",
                "Use the logging module instead of print() for production code. It supports levels, formatting, and output routing."
            )


def analyze_code(code: str) -> dict:
    """Convenience function to analyze code and return results."""
    analyzer = StaticAnalyzer()
    return analyzer.analyze(code)


if __name__ == '__main__':
    # Quick test
    test_code = '''
import os
import sys

password = "supersecret123"

def calculate(data):
    result = eval(input("Enter: "))
    total = sum(data) / len(data)
    try:
        x = open("file.txt").read()
    except:
        pass
    return total
'''
    results = analyze_code(test_code)
    print(f"\n🐛 Found {len(results['bugs'])} bugs:")
    for bug in results['bugs']:
        print(f"  [{bug['bugType']}] {bug['description']}")
    print(f"\n🔧 {len(results['fixes'])} suggested fixes:")
    for fix in results['fixes']:
        print(f"  ✨ {fix['explanation']}")
