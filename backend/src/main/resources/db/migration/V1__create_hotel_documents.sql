CREATE TABLE hotel_documents (
    collection_name text NOT NULL,
    document_id text NOT NULL,
    data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT hotel_documents_pk PRIMARY KEY (collection_name, document_id),
    CONSTRAINT hotel_documents_collection_not_blank CHECK (length(collection_name) > 0),
    CONSTRAINT hotel_documents_id_not_blank CHECK (length(document_id) > 0),
    CONSTRAINT hotel_documents_data_object CHECK (jsonb_typeof(data) = 'object')
);

CREATE INDEX hotel_documents_collection_idx ON hotel_documents (collection_name);
CREATE INDEX hotel_documents_data_gin_idx ON hotel_documents USING gin (data jsonb_path_ops);

CREATE TABLE hotel_auth_accounts (
    uid text PRIMARY KEY,
    email text NOT NULL,
    password_hash text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX hotel_auth_accounts_email_lower_uq ON hotel_auth_accounts (lower(email));

CREATE TABLE hotel_auth_sessions (
    token_hash text PRIMARY KEY,
    uid text NOT NULL REFERENCES hotel_auth_accounts(uid) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hotel_auth_sessions_expiry_idx ON hotel_auth_sessions (expires_at);
