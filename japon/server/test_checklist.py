import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from checklist import ACCESS_PATH, ALLOWED_ORIGIN, make_server


class ChecklistApiTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.server = make_server("127.0.0.1", 0, Path(self.temp.name) / "state.json")
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f"http://127.0.0.1:{self.server.server_port}{ACCESS_PATH}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, method="GET", body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = Request(self.url, data=data, method=method, headers={"Content-Type": "application/json"})
        with urlopen(req) as response:
            return response, json.loads(response.read()) if response.status != 204 else None

    def test_toggle_persists_and_untoggles(self):
        _, initial = self.request()
        self.assertEqual(initial, {"done": [], "updatedAt": None})

        response, state = self.request("POST", {"id": "act-tokio-teamlab", "done": True})
        self.assertEqual(response.headers["Access-Control-Allow-Origin"], ALLOWED_ORIGIN)
        self.assertEqual(state["done"], ["act-tokio-teamlab"])

        _, reloaded = self.request()
        self.assertEqual(reloaded["done"], ["act-tokio-teamlab"])
        _, cleared = self.request("POST", {"id": "act-tokio-teamlab", "done": False})
        self.assertEqual(cleared["done"], [])

    def test_independent_toggles_do_not_overwrite_each_other(self):
        self.request("POST", {"id": "act-tokio-a", "done": True})
        _, state = self.request("POST", {"id": "act-kioto-b", "done": True})
        self.assertEqual(state["done"], ["act-kioto-b", "act-tokio-a"])

    def test_rejects_invalid_input_and_put(self):
        for method, body, expected in [
            ("POST", {"id": "../bad", "done": True}, 400),
            ("POST", {"id": "act-ok", "done": "yes"}, 400),
            ("PUT", {"done": []}, 405),
        ]:
            with self.assertRaises(HTTPError) as caught:
                self.request(method, body)
            self.assertEqual(caught.exception.code, expected)


if __name__ == "__main__":
    unittest.main()
