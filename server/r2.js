const crypto = require("crypto");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key, value) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function signingKey(secret, date) {
  return hmac(hmac(hmac(hmac("AWS4" + secret, date), "auto"), "s3"), "aws4_request");
}

function encodePath(key) {
  return String(key).split("/").map(encodeURIComponent).join("/");
}

function amzDate(now) {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function presignGet({ host, bucket, key, accessKey, secret, expires, now }) {
  const stamp = amzDate(now || new Date());
  const date = stamp.slice(0, 8);
  const credential = `${accessKey}/${date}/auto/s3/aws4_request`;
  const pairs = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", credential],
    ["X-Amz-Date", stamp],
    ["X-Amz-Expires", String(expires || 86400)],
    ["X-Amz-SignedHeaders", "host"]
  ];
  const query = pairs
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .sort()
    .join("&");
  const canonical = [
    "GET",
    `/${bucket}/${encodePath(key)}`,
    query,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD"
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", stamp, `${date}/auto/s3/aws4_request`, sha256(canonical)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(secret, date)).update(stringToSign).digest("hex");
  return `https://${host}/${bucket}/${encodePath(key)}?${query}&X-Amz-Signature=${signature}`;
}

function signPut({ host, bucket, key, accessKey, secret, contentType, payloadHash, now }) {
  const stamp = amzDate(now || new Date());
  const date = stamp.slice(0, 8);
  const payload = payloadHash || "UNSIGNED-PAYLOAD";
  const signed = ["content-type", "host", "x-amz-content-sha256", "x-amz-date"];
  const headers = {
    "content-type": contentType,
    host,
    "x-amz-content-sha256": payload,
    "x-amz-date": stamp
  };
  const canonical = [
    "PUT",
    `/${bucket}/${encodePath(key)}`,
    "",
    signed.map((name) => `${name}:${headers[name]}\n`).join(""),
    signed.join(";"),
    payload
  ].join("\n");
  const scope = `${date}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256(canonical)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(secret, date)).update(stringToSign).digest("hex");
  return {
    url: `https://${host}/${bucket}/${encodePath(key)}`,
    headers: {
      "content-type": contentType,
      "x-amz-content-sha256": payload,
      "x-amz-date": stamp,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signed.join(";")}, Signature=${signature}`
    }
  };
}

module.exports = { presignGet, signPut };
