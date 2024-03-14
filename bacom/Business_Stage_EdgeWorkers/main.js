/* ***********************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2024 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 ************************************************************************* */

import { httpRequest } from 'http-request';
import { logger } from 'log';
import { Cookies } from 'cookies';

const PINK_ENV = 'pink';
const CONFIG_URL = '/.milo/edge-worker-config.json';

async function getConfig() {
    // http subrequest to get the body of the json file in Adobe's main server
    const configReq = await httpRequest(CONFIG_URL);
    const configObj = await configReq.json();
    return configObj;
}

export async function onClientRequest(request) {
    const config = await getConfig();
    const eventStartTime = new Date(config.fgreleasetimeslots_stage.data[0].startTime);
    const eventEndTime = new Date(config.fgreleasetimeslots_stage.data[0].endTime);
    const eventPathRegex = new RegExp(config.paths.data[0].paths);
    const { path } = request;
    const isPathMatch = eventPathRegex.test(path);

    if (!isPathMatch) {
        logger.log('no matching event');
        return;
    }

    const currDateTime = new Date();

    let origin;
    if (currDateTime > eventStartTime && currDateTime < eventEndTime) {
        logger.log('current time is after event start, going to PINK');
        request.setVariable('PMUSER_EW_FG_VERSION', 'pink');
        origin = PINK_ENV;
    } else if (currDateTime > eventEndTime) {
        logger.log('current time is after the event ends, going to MAIN server');
        // do nothing - go to default server
    } else {
        // Access the cookies from the request object
        // Create a loop to validate all cookie headers executes the length of the array
        const cookieHeader = request.getHeader('Cookie');
        const cookies = new Cookies(cookieHeader);
        const fgCookie = cookies.get('fg_stg');
        const verifyRegex = request.getVariable('PMUSER_EW_FG_NTH_WORD');
        const fgCookiePattern = new RegExp(verifyRegex);

        // logger.log('Request cookies are:' + cookies), Check if the "fg" cookie is present
        // iterate through the cookies and if it matches - apply the logic

        // check whether the cookieHeader is defined and has at least one element before trying to access its first element
        const cookieHeaderString = cookieHeader && cookieHeader.length > 0 ? cookieHeader[0] : 'undefined';

        logger.log(`The cookie pattern is: ${fgCookiePattern.test(fgCookie)}, 
                    The cookie header is: [${cookieHeaderString}], 
                    Extract fgCookie: [${fgCookie}], 
                    Extract verifyRegex: [${verifyRegex}]`);

        // boolean - should be true or false
        if (fgCookiePattern.test(fgCookie)) {
            request.setVariable('PMUSER_EW_FG_VERSION', 'pink');
            request.setHeader('X-Adobe-Floodgate', 'pink');
            logger.log('cookie matches: PINK origin');
            origin = PINK_ENV;
        } else {
            logger.log("cookie doesn't match: go to Main origin");
            // do nothing - go to default server
        }
    }

    if (origin) {
        request.route({ origin });
    }
}
