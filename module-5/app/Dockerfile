FROM golang:alpine AS builder

RUN apk update && apk add --no-cache git

WORKDIR /go/src/app
COPY ./service/ .

RUN echo Fetching project dependencies
RUN go get -d -v

RUN echo Building and installing Mystical Mysfits Service
RUN go install -v

FROM alpine AS app
RUN apk update && apk add --no-cache ca-certificates
COPY --from=builder /go/bin/app /bin/app

EXPOSE 8080

RUN echo Starting the Go service...
CMD ["app"]
