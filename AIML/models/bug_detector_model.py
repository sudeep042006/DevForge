"""
Bug Detector Model
Trains a RandomForestClassifier on the synthetic bug dataset.
Run this script AFTER generating the dataset with bug_patterns_dataset.py.
Outputs: bug_detector.pkl (the trained model)
"""

import pickle
import os
import sys
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Add parent dir to path so we can import the dataset generator
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

DATASET_PATH = os.path.join(os.path.dirname(__file__), '..', 'bug_dataset.pkl')
MODEL_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'bug_detector.pkl')

FEATURE_KEYS = [
    'line_count', 'has_eval', 'has_exec', 'has_try_except', 'has_bare_except',
    'has_nested_loops', 'has_input', 'has_open_file', 'has_return', 'has_class',
    'has_import', 'has_type_hints', 'has_hardcoded_password', 'has_string_concat_loop',
    'has_sql_string', 'has_pickle_load', 'avg_line_length', 'max_indent', 'comment_ratio'
]


def load_dataset():
    """Load the pickle dataset."""
    if not os.path.exists(DATASET_PATH):
        print(f"[ERROR] Dataset not found at {DATASET_PATH}")
        print("   Run: python datasets/bug_patterns_dataset.py first")
        sys.exit(1)

    with open(DATASET_PATH, 'rb') as f:
        dataset = pickle.load(f)

    print(f"[LOADED] {len(dataset)} samples from dataset")
    return dataset


def extract_feature_vector(sample):
    """Convert a sample's features dict to a numpy array."""
    return [sample['features'].get(k, 0) for k in FEATURE_KEYS]


def train_model():
    """Train and save the bug detection model."""
    dataset = load_dataset()

    # Build feature matrix and label vector
    X = np.array([extract_feature_vector(s) for s in dataset])
    y = np.array([s['label'] for s in dataset])

    print(f"[DATA] Feature matrix shape: {X.shape}")
    print(f"   Clean samples: {sum(y == 0)}, Buggy samples: {sum(y == 1)}")

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        class_weight='balanced'
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    print("\n[EVAL] Model Evaluation:")
    print(classification_report(y_test, y_pred, target_names=['Clean', 'Buggy']))

    # Feature importance
    importances = sorted(
        zip(FEATURE_KEYS, model.feature_importances_),
        key=lambda x: x[1], reverse=True
    )
    print("[KEY] Top Feature Importances:")
    for name, imp in importances[:8]:
        print(f"   {name}: {imp:.4f}")

    # Save model
    with open(MODEL_OUTPUT_PATH, 'wb') as f:
        pickle.dump({
            'model': model,
            'feature_keys': FEATURE_KEYS
        }, f)

    print(f"\n[OK] Model saved to {os.path.abspath(MODEL_OUTPUT_PATH)}")
    return model


if __name__ == '__main__':
    train_model()
