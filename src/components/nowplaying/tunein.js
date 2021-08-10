var database = require("./tuneinDatabase.js")
var rest = require("restler")
let moduleLogger = log.child({ component: "tunein" });

module.exports.sendSong = async (username, title, artist) => {
    let logger = moduleLogger.child({ username });
    let res
    try {
        res = await database.getInfo(username)
    } catch (error) {
        if (error && error.message !== "Username not in database") {
            return logger.error(error);
        }
        return
    }
    if (!res.isEnabled) {
        return
    }
    if (typeof title === "undefined" || title.length === 0) {
        title = "Unknown"
    }
    if (typeof artist === "undefined" || artist.length === 0) {
        artist = "Unknown"
    }
    let data = {
        partnerId: res.partnerId.toString(),
        partnerKey: res.partnerKey.toString(),
        id: res.stationId,
        title: title,
        artist: artist,
    };
    logger = logger.child({ data });
    logger.debug("Sending request");
    rest.post("https://air.radiotime.com/Playing.ashx", {
        data: data,
        timeout: 5000,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "SHOUTca.st",
        },
    }).on("complete", function (response, info) {
        if (response instanceof Error) {
            logger.error(response, "Request to TuneIn API failed");
            return;
        }
        if (typeof response === "string" && response.includes("<status>403</status>")
                || info.statusCode === 403) {
            // Not disabling the integration as TuneIn sends 403 randomly.
            logger.warn("Got a 403, ignoring");
            // logger.error("Got a 403 response, disabling integration");
            // database.disable(username, "Invalid credentials. Please reconfigure the integration.");
            return;
        }
        logger.debug({ response }, "Updated TuneIn listing");
    }).on("403", function () {
        // Not disabling the integration as TuneIn sends 403 randomly.
        logger.warn("Got a 403, ignoring");
        // logger.error("Got a 403 response, disabling integration");
        // database.disable(username, "Invalid credentials. Please reconfigure the integration.");
    });
}

module.exports.testInfo = (settings) => new Promise((resolve, reject) => {
    let logger = moduleLogger.child({ username: settings.username });
    let data = {
        partnerId: settings.partnerId.toString(),
        partnerKey: settings.partnerKey.toString(),
        id: settings.stationId,
        title: "Test title",
        artist: "Now Playing Integration",
    };
    logger = logger.child({ data });
    logger.debug("Sending test request");
    rest.post("https://air.radiotime.com/Playing.ashx", {
        data: data,
        timeout: 5000,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "SHOUTca.st",
        },
    }).on("complete", function (response, info) {
        if (response instanceof Error) {
            return reject(new Error("Invalid details provided for TuneIn AIR"))
        }
        if (typeof response === "string" && response.includes("<status>403</status>")
                || info.statusCode === 403) {
            return reject(new Error("Invalid details provided for TuneIn AIR"));
        }
        return resolve()
    })
})

module.exports.getAllUsers = function () {
    return database.getAllUsers()
}
