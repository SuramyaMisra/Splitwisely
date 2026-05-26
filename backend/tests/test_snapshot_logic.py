def test_participant_snapshot_logic():

    original_members = [1, 2, 3, 4]

    expense_participants = original_members.copy()

    # later new member joins
    current_members = [1, 2, 3, 4, 5]

    assert len(expense_participants) == 4

    assert 5 not in expense_participants