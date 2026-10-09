FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app
COPY pom.xml ./
COPY src ./src
RUN mvn --batch-mode --no-transfer-progress clean package -DskipTests

FROM eclipse-temurin:17-jre

WORKDIR /app
COPY --from=build /app/target/hotel-management-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
