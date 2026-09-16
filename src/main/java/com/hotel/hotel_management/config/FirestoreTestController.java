package com.hotel.hotel_management.config;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Hidden
@RestController
public class FirestoreTestController {

    private final Firestore firestore;

    public FirestoreTestController(Firestore firestore) {
        this.firestore = firestore;
    }

    @GetMapping("/api/firebase-test")
    public String testFirebase() throws Exception {

        Map<String, Object> data = new HashMap<>();

        data.put("message", "Firebase is working");
        data.put("system", "Hotel Management System");

        DocumentReference document =
                firestore
                        .collection("test")
                        .document("connection");

        ApiFuture<?> future = document.set(data);

        future.get();

        return "Firebase Firestore is working!";
    }
}