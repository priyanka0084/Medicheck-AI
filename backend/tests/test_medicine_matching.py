"""
test_medicine_matching.py — The reference baseline must be the one the user actually named.
"""

import json
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from explanation import find_matching_medicine_stats

with open(os.path.join(backend_dir, "model", "model_meta.json"), encoding="utf-8") as f:
    STATS = json.load(f)["medicine_stats"]


def test_every_known_name_matches_itself():
    for name in STATS:
        matched, stats = find_matching_medicine_stats(name, STATS)
        assert matched == name
        assert stats is STATS[name]


def test_matching_ignores_case_and_outer_spaces():
    assert find_matching_medicine_stats("  paracetamol ", STATS)[0] == "Paracetamol"
    assert find_matching_medicine_stats("omeprazole", STATS)[0] == "OMEPRAZOLE"


def test_short_name_does_not_match_a_longer_combination_product():
    # "Paracetamol" is contained in several combination products listed before it.
    assert find_matching_medicine_stats("Paracetamol", STATS)[0] == "Paracetamol"


def test_most_specific_substring_wins():
    matched, _ = find_matching_medicine_stats("Paracetamol modified release", STATS)
    assert matched == "Paracetamol modified release tablets"


def test_typed_name_containing_a_known_name_still_matches():
    assert find_matching_medicine_stats("Paracetamol 500mg tablets", STATS)[0] == "Paracetamol"


def test_typos_fall_back_to_approximate_matching():
    assert find_matching_medicine_stats("Rabeprazole", STATS)[0] == "Rabeparazole"


def test_blank_or_missing_input_matches_nothing():
    assert find_matching_medicine_stats("", STATS) == (None, {})
    assert find_matching_medicine_stats("   ", STATS) == (None, {})
    assert find_matching_medicine_stats(None, STATS) == (None, {})
    assert find_matching_medicine_stats("Paracetamol", {}) == (None, {})
