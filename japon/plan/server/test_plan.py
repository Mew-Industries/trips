#!/usr/bin/env python3
import os
import sqlite3
import tempfile
import unittest

from plan import clean_promoted, init_plan_db, read_plan, write_plan


class PlanTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.con = sqlite3.connect(os.path.join(self.tmp.name, "plan.db"))
        self.con.row_factory = sqlite3.Row
        init_plan_db(self.con)

    def tearDown(self):
        self.con.close()
        self.tmp.cleanup()

    def test_promote_read_remove_read_and_idempotence(self):
        key = "shirakawago:1"
        write_plan(self.con, "t", "2026-10-19", [key, key], "one")
        self.assertEqual(read_plan(self.con, "t")["2026-10-19"]["promoted"], [key])
        write_plan(self.con, "t", "2026-10-19", [], "two")
        self.assertEqual(read_plan(self.con, "t")["2026-10-19"]["promoted"], [])

    def test_rejects_bad_values(self):
        with self.assertRaises(ValueError): clean_promoted(["ok", "\nno"])


if __name__ == "__main__":
    unittest.main()
