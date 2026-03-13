"""
Bug Patterns Dataset Generator
Generates a synthetic dataset of code snippets labeled with bug categories.
Run this script to produce 'bug_dataset.pkl' for model training.
"""

import pickle
import os
import random

# ---------------------------------------------------------------
# Code templates — each tuple is (code_snippet, label, features_dict)
# Labels: 0 = clean, 1 = has_bug
# ---------------------------------------------------------------

CLEAN_SAMPLES = [
    # Well-written Python snippets
    """
def add(a, b):
    return a + b
""",
    """
import os

def read_file(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
    with open(path, 'r') as f:
        return f.read()
""",
    """
def factorial(n):
    if n < 0:
        raise ValueError("n must be non-negative")
    if n <= 1:
        return 1
    return n * factorial(n - 1)
""",
    """
try:
    result = int(input("Enter a number: "))
    print(f"Square: {result ** 2}")
except ValueError:
    print("Invalid input")
""",
    """
class Calculator:
    def __init__(self):
        self.history = []
    
    def add(self, a, b):
        result = a + b
        self.history.append(('add', a, b, result))
        return result
""",
    """
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
""",
    """
from typing import List

def filter_even(numbers: List[int]) -> List[int]:
    return [n for n in numbers if n % 2 == 0]
""",
    """
import json

def parse_config(filepath):
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Config error: {e}")
        return {}
""",
]

BUGGY_SAMPLES = [
    # Security: eval usage
    ("""
user_input = input("Enter expression: ")
result = eval(user_input)
print(result)
""", "Security", "Using eval() on user input allows arbitrary code execution"),

    # Security: exec usage
    ("""
code = input("Enter code: ")
exec(code)
""", "Security", "Using exec() on user input allows arbitrary code execution"),

    # Logical: division by zero
    ("""
def average(numbers):
    total = sum(numbers)
    return total / len(numbers)
""", "Logical", "No check for empty list — will cause ZeroDivisionError"),

    # Logical: off-by-one
    ("""
def get_last(items):
    return items[len(items)]
""", "Logical", "Off-by-one error: should be items[len(items)-1] or items[-1]"),

    # Performance: nested loop on large data
    ("""
def find_duplicates(lst):
    duplicates = []
    for i in range(len(lst)):
        for j in range(len(lst)):
            if i != j and lst[i] == lst[j] and lst[i] not in duplicates:
                duplicates.append(lst[i])
    return duplicates
""", "Performance", "O(n²) nested loop — use a set or Counter for O(n) duplicate detection"),

    # Security: hardcoded password
    ("""
DB_PASSWORD = "admin123"
def connect():
    return db.connect(password=DB_PASSWORD)
""", "Security", "Hardcoded password in source code — use environment variables"),

    # Logical: mutable default argument
    ("""
def append_item(item, lst=[]):
    lst.append(item)
    return lst
""", "Logical", "Mutable default argument — list is shared across calls"),

    # Error handling: bare except
    ("""
try:
    data = open('file.txt').read()
except:
    pass
""", "Style", "Bare except catches all exceptions including SystemExit and KeyboardInterrupt"),

    # Logical: variable shadowing
    ("""
items = [1, 2, 3]
sum = 0
for item in items:
    sum += item
print(sum([1,2,3]))
""", "Logical", "Built-in 'sum' is shadowed by variable assignment"),

    # Performance: string concatenation in loop
    ("""
def build_report(items):
    report = ""
    for item in items:
        report += str(item) + "\\n"
    return report
""", "Performance", "String concatenation in loop is O(n²) — use ''.join() instead"),

    # Security: SQL injection
    ("""
def get_user(username):
    query = "SELECT * FROM users WHERE name = '" + username + "'"
    return db.execute(query)
""", "Security", "SQL injection vulnerability — use parameterized queries"),

    # Logical: infinite loop risk
    ("""
def countdown(n):
    while n > 0:
        print(n)
""", "Logical", "Missing n -= 1 decrement — will cause infinite loop"),

    # Logical: missing return
    ("""
def is_positive(n):
    if n > 0:
        return True
""", "Logical", "Missing return False for non-positive case — returns None implicitly"),

    # Security: pickle load from untrusted
    ("""
import pickle
def load_data(filepath):
    with open(filepath, 'rb') as f:
        return pickle.load(f)
""", "Security", "Loading pickle from untrusted source can execute arbitrary code"),

    # Performance: reading entire file into memory
    ("""
def count_lines(filepath):
    content = open(filepath).read()
    return content.count('\\n')
""", "Performance", "Reads entire file into memory — file handle not closed properly"),

    # Logical: integer division
    ("""
def percentage(part, whole):
    return part / whole * 100
""", "Logical", "No check for whole == 0, will raise ZeroDivisionError"),
]


def extract_features(code: str) -> dict:
    """Extract feature vector from a code snippet."""
    lines = code.strip().split('\n')
    return {
        'line_count': len(lines),
        'has_eval': 1 if 'eval(' in code else 0,
        'has_exec': 1 if 'exec(' in code else 0,
        'has_try_except': 1 if 'try:' in code and 'except' in code else 0,
        'has_bare_except': 1 if 'except:' in code else 0,
        'has_nested_loops': 1 if code.count('for ') >= 2 or code.count('while ') >= 2 else 0,
        'has_input': 1 if 'input(' in code else 0,
        'has_open_file': 1 if 'open(' in code else 0,
        'has_return': 1 if 'return ' in code else 0,
        'has_class': 1 if 'class ' in code else 0,
        'has_import': 1 if 'import ' in code else 0,
        'has_type_hints': 1 if '->' in code or ': ' in code else 0,
        'has_hardcoded_password': 1 if any(kw in code.lower() for kw in ['password', 'secret', 'api_key']) else 0,
        'has_string_concat_loop': 1 if '+=' in code and ('for ' in code or 'while ' in code) else 0,
        'has_sql_string': 1 if 'SELECT' in code or 'INSERT' in code or 'DELETE' in code else 0,
        'has_pickle_load': 1 if 'pickle.load' in code else 0,
        'avg_line_length': sum(len(l) for l in lines) / max(len(lines), 1),
        'max_indent': max((len(l) - len(l.lstrip())) for l in lines) if lines else 0,
        'comment_ratio': sum(1 for l in lines if l.strip().startswith('#')) / max(len(lines), 1),
    }


def generate_dataset():
    """Generate and save the training dataset."""
    dataset = []

    # Add clean samples
    for code in CLEAN_SAMPLES:
        features = extract_features(code)
        dataset.append({
            'code': code.strip(),
            'label': 0,  # clean
            'bug_type': 'None',
            'description': 'Clean code — no issues detected',
            'features': features
        })

    # Add buggy samples
    for code, bug_type, description in BUGGY_SAMPLES:
        features = extract_features(code)
        dataset.append({
            'code': code.strip(),
            'label': 1,  # buggy
            'bug_type': bug_type,
            'description': description,
            'features': features
        })

    # Generate variations (augment dataset)
    augmented = []
    for sample in dataset:
        for _ in range(5):
            # Add random whitespace/comment variations
            code = sample['code']
            if random.random() > 0.5:
                code = "# Auto-generated variation\n" + code
            if random.random() > 0.5:
                code = code + "\n# End of snippet"
            new_features = extract_features(code)
            augmented.append({
                'code': code,
                'label': sample['label'],
                'bug_type': sample['bug_type'],
                'description': sample['description'],
                'features': new_features
            })

    dataset.extend(augmented)
    random.shuffle(dataset)

    # Save dataset
    output_path = os.path.join(os.path.dirname(__file__), '..', 'bug_dataset.pkl')
    with open(output_path, 'wb') as f:
        pickle.dump(dataset, f)

    print(f"[OK] Dataset generated: {len(dataset)} samples saved to {os.path.abspath(output_path)}")
    return dataset


if __name__ == '__main__':
    generate_dataset()
