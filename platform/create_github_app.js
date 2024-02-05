const puppeteer = require('puppeteer');
const axios = require('axios');
const path = require('path');

async function checkAppExists(page) {
    return await page.evaluate(() => {
        const error = document.querySelector('.error');
        if (error === null) {
            return false
        } else {
            return error.innerText.includes('Name is already taken');
        }
    });
}

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Listen for all console events within the page
    page.on('console', msg => {
        for (let i = 0; i < msg.args().length; ++i)
            console.log(`${i}: ${msg.args()[i]}`);
    });

    const relativePath = '../app.html';
    // Get the absolute path to the HTML file
    const absolutePath = path.resolve(__dirname, relativePath);
    const fileUrl = `file://${absolutePath}`;

    await page.goto(fileUrl);
    // 1. Get app name from command
    const appName = process.argv[0];

    // Get the text from the manifest input field
    const manifestText = await page.evaluate(() => {
        return document.getElementById('manifest').value;
    });

    // Parse the manifestText to a JSON object
    const manifestJson = JSON.parse(manifestText);

    // Update the name property of the JSON object
    // manifestJson.name = "New Name" + Date.now();
    manifestJson.name = process.argv[2];

    // Convert the updated JSON object back to a string
    const updatedManifestText = JSON.stringify(manifestJson);

    // Update the manifest input field with the new JSON string
    await page.evaluate((updatedManifestText) => {
        document.getElementById('manifest').value = updatedManifestText;
    }, updatedManifestText);


    await page.evaluate(() => {
        document.getElementById('myForm').submit();
    });

    // Wait for all operations to complete before navigating away or closing the page
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // input user name
    await page.type('#login_field', process.argv[3]);
    // input password
    await page.type('#password', process.argv[4]);

    // 6. submit form to login
    await page.click('input[type="submit"]');

    // Check if error exist after login
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    try {
        let isWrongCredential = await page.evaluate(() => {
            const jsFlashAlert = document.querySelector('.js-flash-alert');
            if (jsFlashAlert === null) {
                // isWrongCredential = false;
                return false;
            } else {
                // isWrongCredential = jsFlashAlert.innerText.includes('Incorrect username or password.');
                return jsFlashAlert.innerText.includes('Incorrect username or password.');
            }
        });

        if (isWrongCredential === true) {
            console.log('Login failed due to incorrect credentials.');
            await browser.close();
        } else {
            try {
                console.log("Successfully login to github");
                await page.click('.btn.btn-primary.btn-block');
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
                let isAppExist = await checkAppExists(page);

                if (isAppExist) {
                    console.error("App is already exist")
                    await browser.close();
                } else {
                    console.log("App is created")
                    const currentUrl = await page.url();
                    console.log('Current URL:', currentUrl);
                    // extract code from url query string
                    const url = new URL(currentUrl);
                    const params = new URLSearchParams(url.search);
                    const code = params.get('code');

                    // If code is null, log a message and close the browser
                    if (code === null) {
                        console.log('Code is null. Closing the browser.');
                        await browser.close();
                        return; // Stop the execution of the rest of the script
                    }

                    let requestUrl = `https://api.github.com/app-manifests/${code}/conversions`;
                    axios.post(requestUrl, {}, {
                        headers: {
                            'Accept': 'application/vnd.github+json',
                            'X-GitHub-Api-Version': '2022-11-28'
                        }
                    })
                        .then(response => {
                            console.log(response.data);
                            // Write token to file if needed
                        })
                        .catch(error => {
                            console.error(error);
                        });
                    await browser.close();
                }
            } catch (error) {
                console.error('An error occurred:', error);
            }
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
})();
