'use client'
import React from 'react'

export default function KeycloakLoginButton() {
    return (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                }}
            >
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--theme-elevation-250)' }} />
                <span style={{ color: 'var(--theme-elevation-500)', fontSize: '0.85rem' }}>or</span>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--theme-elevation-250)' }} />
            </div>
            <a
                href="/api/keycloak/login"
                style={{
                    display: 'inline-block',
                    width: '100%',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--theme-elevation-150)',
                    color: 'var(--theme-text)',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    textAlign: 'center',
                    transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor =
                        'var(--theme-elevation-200)')
                }
                onMouseOut={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor =
                        'var(--theme-elevation-150)')
                }
            >
                Login with Keycloak
            </a>
        </div>
    )
}
