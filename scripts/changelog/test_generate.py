"""Regression coverage for notes, review precedence and merge publication."""

import base64
from copy import deepcopy
import io
import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from generate import MARKER, parse_note, process, render_comment, validate_note

NOTE = {'title': 'Manutenção e correções', 'changes': [
    {'category': 'improved', 'text': 'Atualizamos as ferramentas usadas pelo sistema.'},
    {'category': 'fixed', 'text': 'Corrigimos a contagem de peças.'},
]}
PR = {'number': 12, 'base': {'ref': 'master'}, 'head': {'sha': 'abc'},
      'merged': True, 'state': 'closed', 'title': 'Maintenance', 'body': '',
      'changed_files': 1, 'merged_at': '2026-10-01T12:00:00Z',
      'merge_commit_sha': 'def', 'html_url': 'https://github.com/example/app/pull/12'}


class FakeGitHub:
    def __init__(self, pr=None, comments=None, exists=False):
        self.pr = deepcopy(pr or PR)
        self.comments = comments or []
        self.exists = exists
        self.writes = []

    def request(self, path, method='GET', data=None):
        if method != 'GET':
            self.writes.append((path, method, data))
            return {}
        if path.startswith('/pulls/'):
            return self.pr
        if self.exists:
            return {}
        raise HTTPError(path, 404, 'Not Found', {}, io.BytesIO())

    def paginate(self, path):
        if path.endswith('/comments'):
            return self.comments
        return [{'filename': 'app/Example.php', 'patch': '+ fixed'}]


class ChangelogTest(unittest.TestCase):
    def test_technical_improvements_and_fixes_survive_round_trip(self):
        self.assertEqual(parse_note(render_comment(NOTE, 'abc')), NOTE)

    def test_invalid_notes_are_rejected(self):
        for note in [{'title': '', 'changes': []},
                     {'title': 'Test', 'changes': [{'category': 'unknown', 'text': 'Test'}]},
                     {'title': 'Test', 'changes': [{'category': 'fixed', 'text': ''}]}]:
            with self.subTest(note=note), self.assertRaises(ValueError):
                validate_note(note)

    def test_reviewed_description_takes_precedence_over_bot(self):
        github = FakeGitHub(comments=[{'id': 1, 'user': {'login': 'github-actions[bot]'},
                                      'body': render_comment(NOTE, 'abc')}])
        reviewed = deepcopy(NOTE)
        reviewed['title'] = 'Texto revisado'
        github.pr['body'] = '```changelog\n' + json.dumps(reviewed) + '\n```'
        process(github, 12, publish=True)
        entry = json.loads(base64.b64decode(github.writes[0][2]['content']))
        self.assertEqual(entry['title'], 'Texto revisado')
        self.assertEqual(entry['commit'], 'def')
        self.assertEqual(entry['merged_at'], '2026-10-01T12:00:00Z')
        self.assertEqual(entry['changes'], NOTE['changes'])

    def test_merge_is_idempotent(self):
        github = FakeGitHub(exists=True)
        process(github, 12, publish=True)
        self.assertEqual(github.writes, [])

    def test_closed_without_merge_and_other_branches_do_not_publish(self):
        for values in [{'merged': False}, {'base': {'ref': 'dev'}}]:
            github = FakeGitHub(pr={**PR, **values})
            process(github, 12, publish=True)
            self.assertEqual(github.writes, [])

    @patch('generate.generate_note', return_value=NOTE)
    def test_stale_bot_note_is_regenerated_at_merge(self, generate):
        github = FakeGitHub(comments=[{'id': 1, 'user': {'login': 'github-actions[bot]'},
                                      'body': render_comment(NOTE, 'old')}])
        process(github, 12, publish=True)
        generate.assert_called_once()
        self.assertEqual(len(github.writes), 1)

    @patch('generate.generate_note', return_value=NOTE)
    def test_updates_existing_bot_comment_without_duplicates(self, generate):
        github = FakeGitHub(pr={**PR, 'state': 'open', 'merged': False}, comments=[
            {'id': 42, 'user': {'login': 'github-actions[bot]'}, 'body': render_comment(NOTE, 'old')},
            {'id': 43, 'user': {'login': 'someone'}, 'body': MARKER + '\nmalicious'},
        ])
        process(github, 12)
        self.assertEqual(github.writes[0][0:2], ('/issues/comments/42', 'PATCH'))
        self.assertIn('<!-- head:abc -->', github.writes[0][2]['body'])

    @patch('generate.generate_note', side_effect=RuntimeError('Codex unavailable'))
    def test_codex_failure_does_not_publish_a_fake_note(self, generate):
        github = FakeGitHub()
        with self.assertRaises(RuntimeError):
            process(github, 12, publish=True)
        self.assertEqual(github.writes, [])


if __name__ == '__main__':
    unittest.main()
