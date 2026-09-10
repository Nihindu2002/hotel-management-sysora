package com.hotel.hotel_management.room;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
public class RoomImageService {

    private final Cloudinary cloudinary;

    public RoomImageService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public String uploadImage(
            String roomId,
            MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                    "Image file is required");
        }

        try {
            String publicId =
                    "hotel/rooms/" + roomId + "/" + UUID.randomUUID();

            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "public_id", publicId,
                            "folder", "hotel/rooms/" + roomId
                    )
            );

            return result.get("secure_url").toString();

        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Unable to upload room image", exception);
        }
    }

    public void deleteImage(String imageUrl) {

    try {
        String publicId = extractPublicId(imageUrl);

        cloudinary.uploader().destroy(
                publicId,
                ObjectUtils.emptyMap()
        );

    } catch (Exception exception) {
        throw new IllegalStateException(
                "Unable to delete room image", exception);
    }
}

private String extractPublicId(String imageUrl) {

    String uploadMarker = "/upload/";

    int uploadIndex = imageUrl.indexOf(uploadMarker);

    if (uploadIndex == -1) {
        throw new IllegalArgumentException(
                "Invalid Cloudinary image URL");
    }

    String publicIdWithExtension =
            imageUrl.substring(
                    uploadIndex + uploadMarker.length());

    int versionIndex = publicIdWithExtension.indexOf("/v");

    if (versionIndex != -1) {
        publicIdWithExtension =
                publicIdWithExtension.substring(
                        versionIndex + 1);
    }

    int extensionIndex =
            publicIdWithExtension.lastIndexOf(".");

    if (extensionIndex != -1) {
        publicIdWithExtension =
                publicIdWithExtension.substring(
                        0, extensionIndex);
    }

    return publicIdWithExtension;
}
}