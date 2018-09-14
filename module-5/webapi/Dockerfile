FROM microsoft/dotnet:2.1-sdk as build
WORKDIR /app
COPY . /app
RUN dotnet publish -c Release -r linux-musl-x64 -o out

FROM microsoft/dotnet:2.1-runtime-deps-alpine
WORKDIR /app
COPY --from=build /app/out ./
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080/tcp
ENTRYPOINT [ "./ModernWebAppNET" ]
