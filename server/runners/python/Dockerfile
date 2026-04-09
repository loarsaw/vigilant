FROM golang:1.25-alpine AS builder
WORKDIR /build
COPY shared/main.go .
RUN go mod init runner && go build -o runner .

FROM python:3.12-alpine
COPY --from=builder /build/runner /runner
ENV LANGUAGE=python
EXPOSE 8080
CMD ["/runner"]
