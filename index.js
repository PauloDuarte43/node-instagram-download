'use strict';
const axios = require("axios");
const fs = require('fs');
const Path = require('path');

const express = require('express')
const app = express()
const port = 3000

function getMediaType(mediaData) {
  if (mediaData.shortcode_media.is_video === true) {
    return "video";
  }
  return "image";
}

function createNewUrl(oriUrl) {
  if (oriUrl.slice(-1) != "/") {
    oriUrl += "/";
  }
  return oriUrl + "?__a=1";
}

async function downloadMetaData(url) {
  try {
    const metaData = await axios({
      method: "get",
      url: url,
    });
    return metaData.data.graphql;
  } catch (error) {
    throw error;
  }
}

async function download(url, filename, savePath) {
    const path = Path.resolve(savePath, filename)
    const writer = fs.createWriteStream(path)
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
      })
    
      response.data.pipe(writer)
    
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
      })
}

async function downloadMedia(url, savePath, pick) {
  const newUrl = createNewUrl(url);
  const getMetaData = await downloadMetaData(newUrl);
  const getType = getMediaType(getMetaData);

  const result = {
    file: '',
    type: '',
    thumbnail: ''
  }

  if (getType == "image") {
    let durl;
    console.log(getMetaData.shortcode_media.edge_sidecar_to_children.edges.length)
    if (pick) {
      if (pick > getMetaData.shortcode_media.edge_sidecar_to_children.edges.length - 1) {
        pick = getMetaData.shortcode_media.edge_sidecar_to_children.edges.length - 1;
      }
      durl = getMetaData.shortcode_media.display_url;
      durl = getMetaData.shortcode_media.edge_sidecar_to_children.edges[pick].node.display_url;
    } else {
      durl = getMetaData.shortcode_media.display_url;
    }
    await download(durl, `${getMetaData.shortcode_media.shortcode}.jpg`,savePath);
    result.file = Path.resolve(savePath, `${getMetaData.shortcode_media.shortcode}.jpg`)
    result.type = 'Image'
  } else {
    await download(getMetaData.shortcode_media.video_url,`${getMetaData.shortcode_media.shortcode}.mp4`,savePath);
    await download(getMetaData.shortcode_media.thumbnail_src,`${getMetaData.shortcode_media.shortcode}-thumb.jpg`,savePath);

    result.file = Path.resolve(savePath, `${getMetaData.shortcode_media.shortcode}.mp4`)
    result.thumbnail = Path.resolve(savePath, `${getMetaData.shortcode_media.shortcode}-thumb.jpg`)
    result.type = 'Video'
  }

  return result
}

app.get('/', async (req, res) => {
  // res.sendFile('/home/paulo/Instagram-Downloader/CS7QNpwCUWx.mp4')
  if (req.query.link) {
      const value = await downloadMedia(req.query.link, './', req.query.pick)
      console.log(value)
    res.sendFile(value.file)
  } else {
    res.send('NOLINK');
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});