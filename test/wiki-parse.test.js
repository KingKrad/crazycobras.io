import test from "node:test";
import assert from "node:assert/strict";
import { cleanTitle, tableSongs, trackSongs, albumLinks } from "../tools/wiki-parse.mjs";

test("song titles come out of Wikipedia tables, track listings and discographies", () => {
  const table = [
    '! scope="row"| "[[Search & Rescue (song)|Search & Rescue]]"',
    '! scope="row" | "[[Work (Rihanna song)|Work]]"<br /><span style="font-size:85%;">(Rihanna featuring Drake)</span>',
    '| "Jimmy Cooks"<ref>{{cite web}}</ref>',
    '| Episode: "Out-of-Towners"',
  ].join("\n");
  assert.deepEqual(tableSongs(table).map((s) => [s.title, s.linked]), [["Search & Rescue", true], ["Work", true], ["Jimmy Cooks", false]]);
  const tracks = "{{Track listing\n| title1 = [[Hotline Bling]]\n| title2 = Faithful (featuring Pimp C)\n| note2 = x\n}}";
  assert.deepEqual(trackSongs(tracks).map((s) => s.title), ["Hotline Bling", "Faithful"]);
  assert.deepEqual(albumLinks("! scope=\"row\" | ''[[Views (album)|Views]]''\n| ''[[Not An Album]]''"), ["Views (album)"]);
  assert.equal(cleanTitle("{{sort|Motto|The Motto}}"), "The Motto");
  assert.equal(cleanTitle("'''Nokia'''<ref name=a/>"), "Nokia");
});
