FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY ../shared/main.go .
RUN go mod init runner && go build -o runner .

FROM alpine:3.19
RUN apk add --no-cache g++ musl-dev
COPY --from=builder /build/runner /runner
ENV LANGUAGE=cpp
EXPOSE 8080
CMD ["/runner"]
