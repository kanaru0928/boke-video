package sessionauth

import (
	"strings"
	"testing"
)

func TestSignAndVerify(t *testing.T) {
	secret := []byte("test-secret")
	subject := "anon:some-uuid"

	cookieValue := Sign(subject, secret)
	if !strings.Contains(cookieValue, ".") {
		t.Fatalf("cookie value has no dot: %q", cookieValue)
	}

	got, err := Verify(cookieValue, secret)
	if err != nil {
		t.Fatalf("Verify returned error: %v", err)
	}
	if got != subject {
		t.Fatalf("subject = %q", got)
	}
}

func TestVerifyRejectsWrongSecret(t *testing.T) {
	cookieValue := Sign("anon:uuid", []byte("secret-a"))
	if _, err := Verify(cookieValue, []byte("secret-b")); err == nil {
		t.Fatal("expected error for wrong secret")
	}
}

func TestVerifyRejectsInvalidFormat(t *testing.T) {
	if _, err := Verify("no-dot-here", []byte("secret")); err == nil {
		t.Fatal("expected error for invalid format")
	}
}

func TestVerifyRejectsTamperedSubject(t *testing.T) {
	cookieValue := Sign("anon:uuid-original", []byte("secret"))
	parts := strings.SplitN(cookieValue, ".", 2)
	tampered := "anon:uuid-tampered" + "." + parts[1]
	if _, err := Verify(tampered, []byte("secret")); err == nil {
		t.Fatal("expected error for tampered subject")
	}
}
