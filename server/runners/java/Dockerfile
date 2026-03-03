FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY ../shared/main.go .
RUN go mod init runner && go build -o runner .

FROM eclipse-temurin:21-jdk-alpine
COPY --from=builder /build/runner /runner
ENV LANGUAGE=java
EXPOSE 8080
CMD ["/runner"]
