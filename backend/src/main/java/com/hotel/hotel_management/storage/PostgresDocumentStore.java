package com.hotel.hotel_management.storage;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;
import java.util.regex.Pattern;

/**
 * Small synchronous repository facade over PostgreSQL JSONB documents.
 * It keeps the current document-shaped domain repositories working while the
 * PostgreSQL dependency is removed; all persistence is owned by PostgreSQL.
 */
@Component
public class PostgresDocumentStore {
    private static final Pattern NAME = Pattern.compile("[A-Za-z][A-Za-z0-9_]{0,62}");

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final TransactionTemplate transaction;

    public PostgresDocumentStore(
            JdbcTemplate jdbc,
            ObjectMapper mapper,
            PlatformTransactionManager transactionManager) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    public CollectionReference collection(String name) {
        if (name == null || !NAME.matcher(name).matches()) {
            throw new IllegalArgumentException("Invalid collection name");
        }
        return new CollectionReference(name);
    }

    public WriteBatch batch() {
        return new WriteBatch();
    }

    private String json(Object value) {
        try {
            return mapper.writeValueAsString(normalize(value));
        } catch (Exception exception) {
            throw new IllegalArgumentException("Document cannot be serialized", exception);
        }
    }

    private Object normalize(Object value) {
        if (value instanceof Date date) return date.toInstant().toString();
        if (value instanceof Instant instant) return instant.toString();
        if (value instanceof Enum<?> enumeration) return enumeration.name();
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            map.forEach((key, item) -> result.put(String.valueOf(key), normalize(item)));
            return result;
        }
        if (value instanceof Iterable<?> iterable) {
            List<Object> result = new ArrayList<>();
            iterable.forEach(item -> result.add(normalize(item)));
            return result;
        }
        return value;
    }

    private Map<String, Object> read(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception exception) {
            throw new IllegalStateException("Stored document is not valid JSON", exception);
        }
    }

    private static <T> CompletableFuture<T> future(Supplier<T> supplier) {
        try {
            return CompletableFuture.completedFuture(supplier.get());
        } catch (RuntimeException exception) {
            return CompletableFuture.failedFuture(exception);
        }
    }

    public final class CollectionReference {
        private final String name;

        private CollectionReference(String name) { this.name = name; }

        public DocumentReference document(String id) {
            String resolved = id == null || id.isBlank() ? UUID.randomUUID().toString() : id;
            return new DocumentReference(name, resolved);
        }

        public Query whereEqualTo(String field, Object value) {
            return new Query(name).whereEqualTo(field, value);
        }

        public CompletableFuture<QuerySnapshot> get() {
            return new Query(name).get();
        }
    }

    public final class DocumentReference {
        private final String collection;
        private final String id;

        private DocumentReference(String collection, String id) {
            this.collection = collection;
            this.id = id;
        }

        public String getId() { return id; }

        public CompletableFuture<DocumentSnapshot> get() {
            return future(() -> {
                List<Map<String, Object>> rows = jdbc.query(
                        "select data::text from hotel_documents where collection_name = ? and document_id = ?",
                        (rs, row) -> read(rs.getString(1)), collection, id);
                return rows.isEmpty()
                        ? new DocumentSnapshot(id, null)
                        : new DocumentSnapshot(id, rows.get(0));
            });
        }

        public CompletableFuture<Void> set(Map<String, ?> data) {
            return future(() -> {
                jdbc.update("""
                        insert into hotel_documents(collection_name, document_id, data)
                        values (?, ?, ?::jsonb)
                        on conflict (collection_name, document_id)
                        do update set data = excluded.data, updated_at = now()
                        """, collection, id, json(data));
                return null;
            });
        }

        public CompletableFuture<Void> update(Map<String, ?> values) {
            return future(() -> {
                int changed = jdbc.update("update hotel_documents set data = data || ?::jsonb, updated_at = now() where collection_name = ? and document_id = ?",
                        json(values), collection, id);
                if (changed == 0) throw new IllegalStateException("Document does not exist: " + id);
                return null;
            });
        }

        public CompletableFuture<Void> update(String field, Object value) {
            Map<String, Object> values = new LinkedHashMap<>();
            values.put(field, normalize(value));
            return update(values);
        }

        public CompletableFuture<Void> delete() {
            return future(() -> {
                jdbc.update("delete from hotel_documents where collection_name = ? and document_id = ?", collection, id);
                return null;
            });
        }
    }

    public final class Query {
        private final String collection;
        private final List<String> fields = new ArrayList<>();
        private final List<Object> values = new ArrayList<>();
        private Integer maxRows;

        private Query(String collection) { this.collection = collection; }

        public Query whereEqualTo(String field, Object value) {
            if (field == null || !field.matches("[A-Za-z][A-Za-z0-9_]{0,62}")) {
                throw new IllegalArgumentException("Invalid document field");
            }
            fields.add(field);
            values.add(value == null ? null : normalize(value).toString());
            return this;
        }

        public Query limit(long limit) {
            if (limit < 0 || limit > Integer.MAX_VALUE) throw new IllegalArgumentException("Invalid query limit");
            maxRows = (int) limit;
            return this;
        }

        public CompletableFuture<QuerySnapshot> get() {
            return future(() -> {
                StringBuilder sql = new StringBuilder("select document_id, data::text from hotel_documents where collection_name = ?");
                List<Object> args = new ArrayList<>();
                args.add(collection);
                for (int i = 0; i < fields.size(); i++) {
                    sql.append(" and data ->> ? IS NOT DISTINCT FROM ?");
                    args.add(fields.get(i));
                    args.add(values.get(i));
                }
                sql.append(" order by document_id");
                if (maxRows != null) sql.append(" limit ").append(maxRows);
                List<DocumentSnapshot> result = jdbc.query(sql.toString(), (rs, row) ->
                        new DocumentSnapshot(rs.getString(1), read(rs.getString(2))), args.toArray());
                return new QuerySnapshot(result);
            });
        }
    }

    public final class WriteBatch {
        private final List<Runnable> operations = new ArrayList<>();

        public WriteBatch update(DocumentReference document, String field, Object value) {
            operations.add(() -> document.update(field, value).join());
            return this;
        }

        public CompletableFuture<Void> commit() {
            return future(() -> {
                transaction.executeWithoutResult(status -> operations.forEach(Runnable::run));
                return null;
            });
        }
    }

    public static final class QuerySnapshot {
        private final List<DocumentSnapshot> documents;
        private QuerySnapshot(List<DocumentSnapshot> documents) { this.documents = List.copyOf(documents); }
        public List<DocumentSnapshot> getDocuments() { return documents; }
        public java.util.stream.Stream<DocumentSnapshot> stream() { return documents.stream(); }
    }

    public static final class DocumentSnapshot {
        private final String id;
        private final Map<String, Object> data;

        private DocumentSnapshot(String id, Map<String, Object> data) {
            this.id = id;
            this.data = data;
        }

        public String getId() { return id; }
        public boolean exists() { return data != null; }
        public Object get(String field) { return data == null ? null : data.get(field); }
        public Map<String, Object> getData() {
            return data == null ? null : java.util.Collections.unmodifiableMap(new LinkedHashMap<>(data));
        }
        public String getString(String field) {
            Object value = get(field);
            return value == null ? null : value instanceof String s ? s : String.valueOf(value);
        }
        public Long getLong(String field) {
            Object value = get(field);
            return value instanceof Number n ? n.longValue() : null;
        }
        public Double getDouble(String field) {
            Object value = get(field);
            return value instanceof Number n ? n.doubleValue() : null;
        }
        public Boolean getBoolean(String field) {
            Object value = get(field);
            return value instanceof Boolean b ? b : null;
        }
        public Date getDate(String field) {
            Instant instant = instant(get(field));
            return instant == null ? null : Date.from(instant);
        }
        public StoredTimestamp getTimestamp(String field) {
            Instant instant = instant(get(field));
            return instant == null ? null : new StoredTimestamp(instant);
        }
        private static Instant instant(Object value) {
            if (value instanceof String text) {
                try { return Instant.parse(text); }
                catch (RuntimeException ignored) {
                    try { return OffsetDateTime.parse(text).toInstant(); }
                    catch (RuntimeException ignoredAgain) { return null; }
                }
            }
            if (value instanceof Number number) return Instant.ofEpochMilli(number.longValue());
            return null;
        }
    }

    public record StoredTimestamp(Instant instant) {
        public Date toDate() { return Date.from(instant); }
    }
}
