async function getConfig() {
    try {
        const response = await fetch('/ew-test/config.json');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error; // Rethrow the error if needed
    }
}

async function process() {
    try {
        const fullConfig = await getConfig();
        console.log(fullConfig.fgrelease_new);
        const config = fullConfig.fgrelease_new;

        const releaseColor = 'pink';
        const currentTime = new Date('2024-02-26T15:00:00Z');

        // const requestPath = '/events/prod-a.html';
        // const requestPath = '/ca_fr/events/prod-a.html';
        const requestPath = '/customer/prod-a.html';
        // const requestPath = '/customer/sub/prod-a.html';
        // const requestPath = '/ca_fr/customer/sub/prod-a.html';
        // const requestPath = '/products/prod-a.html';
        // const requestPath = '/generic/page.html';

        // Select the matching release based on the release color
        const matchingReleases = config.data.filter(
            (release) => release.release === releaseColor
        );

        // If no matching release is found, log a message
        if (matchingReleases.length === 0) {
            console.log(`No release found. \nServing original content for the requested path ${requestPath}`);
        } else {
            // Select the matching release based on the request path
            const matchingPaths = matchingReleases.filter((release) => {
                const pathsRegex = new RegExp(release.pathsPattern.replace(/,/g, '|'));
                return pathsRegex.test(requestPath);
            });

            // If no matching path is found, log a message
            if (matchingPaths.length === 0) {
                console.log(`No paths matched. \nServing original content for the requested path ${requestPath}`);
                // Serve original content if no matching path is found
            } else {
                // Select the matching release if current time is within the start and end time
                const matchingPathDateTime = matchingPaths.find((release) => {
                    const startTime = new Date(release.startTime);
                    const endTime = new Date(release.endTime);
                    return currentTime >= startTime && currentTime <= endTime;
                });
                // Select the matching release if current time is before the start time
                const matchingPathBeforeStartTime = matchingPaths.find((release) => {
                    const startTime = new Date(release.startTime);
                    return currentTime < startTime;
                });

                if (matchingPathDateTime) {
                    // If matching release is found with the current time between the start and end time
                    console.log(`Serving ${releaseColor} Content for ${requestPath}`);
                    console.log(`Current Time: ${currentTime}`);
                    console.log(`Start Time: ${new Date(matchingPathDateTime.startTime)}`);
                    console.log(`End Time: ${new Date(matchingPathDateTime.endTime)}`);
                    // console.log(`Paths Regex: ${matchingPathDateTime.paths}`);
                    console.log(`Paths Regex: ${matchingPathDateTime.pathsPattern}`);
                } else if (matchingPathBeforeStartTime) {
                    console.log(`Request Path: ${requestPath}`);
                    // If matching release is found with the current time before the start time
                    console.log('- FG release has not started yet OR Request path does not match the FG release \n- Serving original content');
                    // Access the cookies from the request object and display pink content if valid floodgate cookie exists
                    // Serve all content if valid floodgate cookie is present
                } else {
                    console.log(`Request Path: ${requestPath}`);
                    // If current time is after the end time of all the available releases
                    console.log(
                        `No active FG releases found. \nServing original content for the requested path ${requestPath}`
                    );
                }
            }
        }
    } catch (error) {
        // Handle errors if needed
    }
}

process();
