# The app is served from a bind-mounted ./app directory, so this image only needs
# PHP, Apache, the zip extension (for backup export) and rewrite/headers modules.
FROM php:8.2-apache

RUN apt-get update \
 && apt-get install -y --no-install-recommends libzip-dev git ca-certificates \
 && docker-php-ext-install zip \
 && a2enmod rewrite headers \
 && sed -ri 's#AllowOverride None#AllowOverride All#g' /etc/apache2/apache2.conf \
 && rm -rf /var/lib/apt/lists/*
