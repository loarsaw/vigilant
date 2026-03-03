FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY ../shared/main.go .
RUN go mod init runner && go build -o runner .

FROM node:20-alpine
COPY --from=builder /build/runner /runner
ENV LANGUAGE=js
EXPOSE 8080
CMD ["/runner"]
