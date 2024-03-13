// comment

import { httpRequest } from 'http-request';
import { createResponse } from 'create-response';
import {logger} from 'log'
import { Cookies } from 'cookies';

const PINK_ENV = 'pink';
const CONFIG_URL = "/drafts/floodgate/configs/edge-worker-config.json";

async function getConfig() {
    var configReq = await httpRequest(CONFIG_URL); //http subrequest to get the body of the json file in Adobe's main server
    var configObj = await configReq.json(); //read the body of the json file
    return configObj;
}

export async function onClientRequest(request) {
    
    let origin;
    const config = await getConfig(); 
    let eventStartTime = new Date(config.times.data[0].startTime)
    let eventEndTime = new Date(config.times.data[0].endTime)
    let eventPathRegex = new RegExp(config.paths.data[0].paths)

    let path = request.path
    
    let isPathMatch = eventPathRegex.test(path)

    if (!isPathMatch) {
        logger.log("no matching event")
        return;
    }
    
    let currDateTime = new Date()
    
    if (currDateTime > eventStartTime && currDateTime < eventEndTime)
    
    {
        logger.log ("current time is after event start, going to PINK")
        request.setVariable('PMUSER_EW_FG_VERSION','pink');
        origin = PINK_ENV;
        
    } else if (currDateTime > eventEndTime ) {
        logger.log ("current time is after the event ends, going to MAIN server")
        //do nothing - go to default server 
    }
    
    else {
        // Access the cookies from the request object
        
        //create a loop to validate all cookie headers executes the length of the array 
        
        const cookieHeader = request.getHeader('Cookie');
        const cookies = new Cookies(cookieHeader);
        const fgCookie = cookies.get('fg');
        const verifyRegex = request.getVariable('PMUSER_EW_FG_NTH_WORD');
        const fgCookiePattern = new RegExp(verifyRegex)

        //logger.log('Request cookies are:' + cookies), Check if the "fg" cookie is present
        // iterate through the cookies and if it matches - apply the logic 
        
        logger.log('The cookie pattern is: ' + fgCookiePattern.test(fgCookie) + ', The cookie header is: [' + cookieHeader[0] + ']' + ', Extract fgCookie: [' + fgCookie + ']','Extract verifyRegex: [' + verifyRegex + ']')
                
        if (fgCookiePattern.test(fgCookie)) { //boolean - should be true or false

                request.setVariable('PMUSER_EW_FG_VERSION','pink');
                request.setHeader('X-Adobe-Floodgate', 'pink');                
                logger.log("cookie matches: PINK origin");

                origin = PINK_ENV
                
            }  else {

                logger.log("cookie doesn't match: go to Main origin");
                //do nothing - go to default server
            }   
        }
        
        if (origin) {
            request.route({origin: origin});
        }
    }