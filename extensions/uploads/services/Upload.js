  const blurhash = require('blurhash');
  
  async uploadFileAndPersist(fileData, { user } = {}) {
    const config = strapi.plugins.upload.config;

    const { getDimensions, generateThumbnail, generateResponsiveFormats } =
      strapi.plugins.upload.services["image-manipulation"];

    await strapi.plugins.upload.provider.upload(fileData);

    const thumbnailFile = await generateThumbnail(fileData);
    if (thumbnailFile) {
      await strapi.plugins.upload.provider.upload(thumbnailFile);

      // Additional Blurhash
      // NOTE: Here start blurhash integration

      const encodeImageToBlurhash = (imageBuffer) =>
        new Promise((resolve, reject) => {
          sharp(imageBuffer)
            .raw()
            .ensureAlpha()
            .toBuffer((err, buffer, { width, height }) => {
              if (err) return reject(err);
              resolve(
                blurhash.encode(
                  new Uint8ClampedArray(buffer),
                  width,
                  height,
                  4,
                  4
                )
              );
            });
        });

      const blurHash = await encodeImageToBlurhash(thumbnailFile.buffer);

      // Add a custom field in File.settings.json to add a blurHash
      fileData.blurHash = blurHash;

      // End Additional Blurhash

      delete thumbnailFile.buffer;
      _.set(fileData, "formats.thumbnail", thumbnailFile);
    }

    const formats = await generateResponsiveFormats(fileData);
    if (Array.isArray(formats) && formats.length > 0) {
      for (const format of formats) {
        if (!format) continue;

        const { key, file } = format;

        await strapi.plugins.upload.provider.upload(file);
        delete file.buffer;

        _.set(fileData, ["formats", key], file);
      }
    }

    const { width, height } = await getDimensions(fileData.buffer);

    delete fileData.buffer;

    _.assign(fileData, {
      provider: config.provider,
      width,
      height,
    });

    return this.add(fileData, { user });
  },