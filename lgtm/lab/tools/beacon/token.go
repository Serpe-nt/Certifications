package main

// Check tokens, as defined in lgtm/docs/plan/02-lab-contract.md, "Check tokens".
// The site computes the same values in lgtm/learn/src/lib/token.ts.

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// Channels are the three kinds of slot, in the order the beacon emits them.
var Channels = []string{"log", "metric", "span"}

const (
	firstModule = 0
	lastModule  = 18
	slotsPerMod = 9
)

var seedPattern = regexp.MustCompile(`^[0-9a-f]{16}$`)

// NormaliseSeed trims the seed and writes it in lower case, as the site does
// with what the learner types.
func NormaliseSeed(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}

// ValidSeed reports whether seed is 16 lower-case hexadecimal characters.
func ValidSeed(seed string) bool {
	return seedPattern.MatchString(seed)
}

// Token is the token the beacon publishes for a slot: the first 8 hex
// characters of HMAC-SHA256 with the seed (UTF-8) as key and the slot id as
// message. For a metric slot it is those 8 characters read as a hexadecimal
// number, modulo 1,000,000, written in decimal.
func Token(seed, slot string) string {
	mac := hmac.New(sha256.New, []byte(seed))
	mac.Write([]byte(slot))
	first8 := hex.EncodeToString(mac.Sum(nil))[:8]
	if strings.HasPrefix(slot, "metric-") {
		n, err := strconv.ParseUint(first8, 16, 64)
		if err != nil {
			// Cannot happen: first8 is always valid hexadecimal.
			panic(err)
		}
		return strconv.FormatUint(n%1_000_000, 10)
	}
	return first8
}

// Slots lists every slot id of one channel: <channel>-m00-1 to <channel>-m18-9.
func Slots(channel string) []string {
	out := make([]string, 0, (lastModule-firstModule+1)*slotsPerMod)
	for m := firstModule; m <= lastModule; m++ {
		for n := 1; n <= slotsPerMod; n++ {
			out = append(out, fmt.Sprintf("%s-m%02d-%d", channel, m, n))
		}
	}
	return out
}

// Slot is one slot id with its token.
type Slot struct {
	ID    string
	Token string
}

// SlotTokens computes the token of every slot of one channel.
func SlotTokens(seed, channel string) []Slot {
	ids := Slots(channel)
	out := make([]Slot, len(ids))
	for i, id := range ids {
		out[i] = Slot{ID: id, Token: Token(seed, id)}
	}
	return out
}
