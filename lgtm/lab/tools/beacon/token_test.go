package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strconv"
	"testing"
)

// The shared test vectors live with the site, so both sides are checked
// against the same file. TOKEN_VECTORS overrides the path.
const defaultVectors = "../../../learn/tests/fixtures/token-vectors.json"

type vectorFile struct {
	Vectors []struct {
		Seed  string `json:"seed"`
		Slot  string `json:"slot"`
		Hex8  string `json:"hex8"`
		Token string `json:"token"`
	} `json:"vectors"`
}

func TestSharedVectors(t *testing.T) {
	path := os.Getenv("TOKEN_VECTORS")
	if path == "" {
		path = filepath.FromSlash(defaultVectors)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read the shared vectors: %v", err)
	}
	var file vectorFile
	if err := json.Unmarshal(raw, &file); err != nil {
		t.Fatalf("parse %s: %v", path, err)
	}
	if len(file.Vectors) != 6 {
		t.Fatalf("expected 6 vectors in %s, found %d", path, len(file.Vectors))
	}
	for _, v := range file.Vectors {
		got := Token(v.Seed, v.Slot)
		if got != v.Token {
			t.Errorf("Token(%q, %q) = %q, want %q", v.Seed, v.Slot, got, v.Token)
		}
		// The hex8 column is the token before the metric conversion.
		n, err := strconv.ParseUint(v.Hex8, 16, 64)
		if err != nil {
			t.Fatalf("bad hex8 %q: %v", v.Hex8, err)
		}
		if v.Slot[:7] == "metric-" && strconv.FormatUint(n%1_000_000, 10) != v.Token {
			t.Errorf("vector %s: hex8 %s does not give token %s", v.Slot, v.Hex8, v.Token)
		}
		t.Logf("%s %s -> %s", v.Seed, v.Slot, got)
	}
}

func TestSlots(t *testing.T) {
	for _, ch := range Channels {
		s := Slots(ch)
		if len(s) != 19*9 {
			t.Fatalf("%s: %d slots, want %d", ch, len(s), 19*9)
		}
		if s[0] != ch+"-m00-1" || s[len(s)-1] != ch+"-m18-9" {
			t.Errorf("%s: first %s, last %s", ch, s[0], s[len(s)-1])
		}
	}
}

func TestSeed(t *testing.T) {
	if !ValidSeed(NormaliseSeed("  0123456789ABCDEF\n")) {
		t.Error("an upper-case seed with spaces should normalise to a valid seed")
	}
	for _, bad := range []string{"", "0123456789abcde", "0123456789abcdeg", "0123456789abcdef0"} {
		if ValidSeed(bad) {
			t.Errorf("ValidSeed(%q) = true", bad)
		}
	}
}
