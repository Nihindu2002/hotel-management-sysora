package com.hotel.hotel_management.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

import java.io.IOException;
import java.io.FileInputStream;
import java.io.InputStream;

import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;

@Configuration
public class FirebaseConfig {

        @Value("${firebase.service-account}")
        private String serviceAccountPath;

        @Value("${firebase.project-id}")
        private String projectId;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {

        String credentialsPath = System.getenv("GOOGLE_APPLICATION_CREDENTIALS");
        InputStream serviceAccount = credentialsPath == null || credentialsPath.isBlank()
                ? getClass().getClassLoader().getResourceAsStream(serviceAccountPath)
                : new FileInputStream(credentialsPath);

        if (serviceAccount == null) {
            throw new IOException(
                    "Firebase service account file not found"
            );
        }

        FirebaseOptions options =
                FirebaseOptions.builder()
                        .setCredentials(
                                GoogleCredentials.fromStream(
                                        serviceAccount
                                )
                        )
                        .setHttpTransport(new NetHttpTransport())
                        .setProjectId(projectId)
                        .build();

        if (FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.initializeApp(options);
        }

        return FirebaseApp.getInstance();
    }

    @Bean
        public Firestore firestore(FirebaseApp firebaseApp) {
        return FirestoreClient.getFirestore();
    }

        @Bean
        public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
                return FirebaseAuth.getInstance(firebaseApp);
        }
}