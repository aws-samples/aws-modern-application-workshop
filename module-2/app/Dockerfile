FROM public.ecr.aws/bitnami/golang:latest AS builder

WORKDIR /go/src/app
COPY ./service/ .

RUN echo Fetching project dependencies
RUN go get -d -v

RUN echo Building and installing Mystical Mysfits Service
RUN go install -v

FROM quay.io/libpod/alpine AS app
COPY --from=builder /go/bin/app /bin/app
COPY --from=builder /go/src/app/mysfits-response.json /mysfits-response.json

EXPOSE 8080

RUN echo Starting the Go service...
CMD ["app"]
