import puppeteer from "puppeteer";
import path from "path";
import * as dotenv from "dotenv";
import { url } from "inspector";
dotenv.config();

// Establish general params of app, and then invoke processes ...
async function app() {
    try {
        // ** GENERAL SETTINGS **
        const pageSize = { width: 1080, height: 1920 };

        // Evaluate what page(s) should be worked on ...
        //      For one page, put that page # twice; otherwise, put the first and last pages:
        //      Ex: for page #1 only, put (1, 1)
        //      Ex: for pages 3 - 5, put (3, 5)
        const pagesArray = workScope(1, 3); // 👀 CHANGE THIS IF YOU WANT TO SET 'START' AND 'END' INDEX PAGES 👀

        // ** APP STARTUP **

        // Open a browser visible to a user (rather than headless):
        const browser = await puppeteer.launch({ headless: false });
        // Return the page(s) that are open in an array
        const pages = await browser.pages();
        // Store the open page
        const firstTab = pages[0];

        // ** LOGIN TO FILE HOSTING SITE **
        await cloudLogin(firstTab);

        // ** LOGIN TO MODEL SHARING SITE **
        await modelSiteLogin(pageSize, firstTab);

        // ** PERFORM WORK () **
        await work(pagesArray, firstTab, pageSize, browser);

        console.log(`🎉 Work completed !! 🎇
            \n 👋 Exiting ...`);
    } catch (error) {
        console.log("🚨 0️⃣🅰️ app() error:", error);
    }
}

// Evaluate & return an array of the file-sharing 'Index' pages to receive work ...
function workScope(startPage, endPage) {
    try {
        let pagesList = [];

        (function () {
            for (let i = startPage; i < endPage + 1; i++) {
                pagesList.push(`${process.env.TARGET_LOGIN_LINK}${i}/`);
            }
        })();

        console.log(
            "👉 Begin at ... ",
            `${process.env.TARGET_LOGIN_LINK}${startPage}`
        );
        console.log(
            "✋ End with ... ",
            `${process.env.TARGET_LOGIN_LINK}${endPage}`
        );

        return pagesList; // console.log("pagesList:", pagesList);
    } catch (error) {
        console.log("🚨 0️⃣🅱️ workScope error:", error);
    }
}

// Login to cloud file-hosting site with account ...
async function cloudLogin(firstTab) {
    // TURBO LOGIN
    try {
        // Set cloud website & login credentials
        const cloudLoginUrl = process.env.CLOUD_LOGIN_LINK;
        const userNameTurbo = process.env.USER_NAME_CLOUD;
        const passWordTurbo = process.env.PASSWORD_CLOUD;

        // ** Open website **
        // Open a tab/page:
        const turboLoginPage = firstTab;
        // Go to a website:
        await turboLoginPage.goto(cloudLoginUrl, {
            waitUntil: "networkidle0",
        });
        // ** Log in **
        // Login inputs
        await turboLoginPage.type('input[name="user[login]"]', userNameTurbo, {
            // delay: 0,
        });
        await turboLoginPage.type('input[name="user[pass]"]', passWordTurbo, {
            // delay: 0,
        });
        // Click Login button
        await turboLoginPage.click('input[id="btnSubmit"]');
        // Close Cloud Login Page
        console.log("✨🔓 TURBO Login Succesful !");
        // Delay to complete login
        await turboLoginPage.waitForTimeout(1000);
        // await turboLoginPage.waitForNavigation({
        //     waitUntil: "networkidle2",
        // });
        // await turboLoginPage.close();
    } catch (error) {
        console.log("🚨 1️⃣ cloudLogin error:", error);
    }
}

// Login to file-sharing site with account ...
async function modelSiteLogin(pageSize, firstTab) {
    // Sharing Site LOGIN
    try {
        // Set target website & login credentials
        const targetSiteUrl = process.env.TARGET_LOGIN_LINK + 1;
        const userName = process.env.USER_NAME;
        const passWord = process.env.PASSWORD;

        // ** Open website **
        // Open a tab/page:
        const shareSiteLoginPage = firstTab;
        // Set viewport size
        await shareSiteLoginPage.setViewport(pageSize);
        // Go to the sharing website:
        await shareSiteLoginPage.goto(targetSiteUrl, {
            waitUntil: "networkidle0",
        });

        // ** Log in **
        // Hover to reveal hidden menu
        await shareSiteLoginPage.hover(".top-menu > li:last-of-type");
        // Login inputs
        await shareSiteLoginPage.type('input[name="login_name"]', userName, {
            // delay: 0,
        });
        await shareSiteLoginPage.type(
            'input[name="login_password"]',
            passWord
            // { delay: 0 }
        );
        // Click Login button
        await shareSiteLoginPage.click('input[class="enter"]');
        console.log("✨🔓 Sharing Site Login Succesful!");
        await shareSiteLoginPage.waitForTimeout(1000);
        // await shareSiteLoginPage.waitForNavigation({
        //     waitUntil: "networkidle0",
        // });
    } catch (error) {
        console.log(`🚨 2️⃣ modelSiteLogin error:`, error);
    }
}

// Perform the main work off the app ...
async function work(pagesArray, firstTab, pageSize, browser) {
    try {
        // For all pages in the 'workScope'/'pagesArray ...
        for (
            let currentPage = 0;
            currentPage < pagesArray.length;
            currentPage++
        ) {
            let webPage = pagesArray[currentPage];
            console.log("webPage:", webPage);

            // Go to the given 'Index' page ...
            await firstTab.goto(webPage, {
                waitUntil: "networkidle0",
            });

            // Get all 'Show' pages on the given 'Index' page ...
            let linksList = await grabShowPages(firstTab); // console.log("linksList", linksList); // Delete

            // Download files & return failed 'show' pages ...
            const failedPages = await downloadFiles(
                browser,
                pageSize,
                linksList,
                firstTab
            );

            // Log messages when work is finished on the current 'Index' page ...
            console.log(`☠️ Here are the failed pages: ☠️
            \n ${failedPages} \n`);

            console.log(`👍 ${webPage} finished downloading !!
            \n Exiting ...`);
        }
    } catch (error) {
        console.log(`🚨 7️⃣ work() error:`, error);
    }
}

// Get Individual product/'Show' links from 'Index' page ...
async function grabShowPages(firstTab) {
    try {
        const shareSiteIndexPage = firstTab;
        // Get and return the 'href's of the given 'Index' page ...
        const linksList = await shareSiteIndexPage.evaluate(() => {
            const anchors = document.querySelectorAll(
                ".boxes .boxes-content a[href]"
            );
            let linkList = [];
            anchors.forEach((element) => {
                linkList.push(element.href);
            });
            return linkList;
        });

        console.log(`✨📃 Grab 'show' page links succesful !`);

        return linksList;
    } catch (error) {
        console.log(`🚨 3️⃣ grabShowPages error:`, error);
    }
}

// Open a second tab, go to each 'Show' link, go to its cloud link, and download the file ...
async function downloadFiles(browser, pageSize, linksList) {
    try {
        // Open a new tab/page ...
        const downloadPage = await browser.newPage();
        // Set viewport size ...
        await downloadPage.setViewport(pageSize);

        // Prep for failed downloads ...
        const failedPages = [];

        // For every 'Show' link in sharing site's 'linksList' ...
        for (
            let currentShowPage = 1; // 👀 CHANGE THIS IF YOU WANT TO START AT ANOTHER SHOW PAGE 👀
            // currentShowPage < linksList.length; // USE THIS IF YOU WANT TO DO EVERYTHING ON THE PAGE
            currentShowPage <= 12; // 👀 USE THIS IF YOU NEED TO STOP BEFORE THE END OF THE PAGE 👀
            currentShowPage++
        ) {
            const url = linksList[currentShowPage]; // console.log("url:", url);

            // Go to the given 'Show' page ...
            await downloadPage.goto(`${url}`, {
                waitUntil: "load",
                timeout: 0,
            });

            // ** GRAB CLOUD LINK(S) **
            let tLinks = await getTLinks(downloadPage); // console.log(`The result tLinks from tLinkArray:`, tLinks);

            // CRASH soln: Check whether we have too many or too few cloud links ...
            if (tLinks.length > 1) {
                // If too many, set a delay of 1 min to let them finish ...
                await downloadPage.waitForTimeout(60000);
            } else if (tLinks.length < 1) {
                // If too few, log the failed 'show' page for future review ...
                console.error(`🚨💀 No cloud links were found - \n
                Check ${url} `);
                failedPages.push(url);
            }

            console.log(
                `${currentShowPage}) Downloading sharing site's item "${url}" -
                \n #${currentShowPage} in our linkList, or #${
                    currentShowPage + 1
                } of the current 'Index' page, \n`
            );

            // ** GO TO CLOUD LINK(S) **
            await goDownload(downloadPage, tLinks, url);

            // CRASH soln: Set a delay on every 5 'show' pages ...
            if (
                currentShowPage === 5 ||
                currentShowPage === 10 ||
                currentShowPage === 15
            ) {
                await downloadPage.waitForTimeout(5000);
            }
        }

        console.log("✨☘️ Downloader ran successfuly ! \n");

        // Close Cloud Login Page
        // await downloadPage.close();
        return failedPages;
    } catch (error) {
        // await browser.close();
        console.log(`🚨6️⃣ downloadFiles error:`, error);
    }
}

// Check what (if any) cloud hosting domain is being used, and return all matching links ...
async function getTLinks(downloadPage) {
    try {
        let tLinkArray = await downloadPage.evaluate(() => {
            const tLinkRoots = ["https://turb.pw", "https://turbobit.net"]; // Possible URLs:
            let anchors = []; // Nodelist
            let matches = []; // Array of links

            // Compare current 'show' page with possible cloud domains for matches ...
            for (
                let currentTLinkRoot = 0;
                currentTLinkRoot < tLinkRoots.length;
                currentTLinkRoot++
            ) {
                if (
                    document.querySelector(
                        `[href*="${tLinkRoots[currentTLinkRoot]}"]`
                    )
                ) {
                    anchors = document.querySelectorAll(
                        `[href*="${tLinkRoots[currentTLinkRoot]}"]`
                    );
                }
            }
            // If there's a match, parse the nodelist and push the .href of each to our 'matches' container ...
            for (let i = 0; i < anchors.length; i++) {
                matches.push(anchors[i].href);
            }
            return matches;
        });

        return tLinkArray; // console.log("tLinkArray, after await:", typeof tLinkArray, tLinkArray);
    } catch (error) {
        console.log(`🚨 4️⃣ confirmTLink error:`, error);
    }
}

// Go to cloud hosting site & download the file ...
async function goDownload(downloadPage, tLinks) {
    try {
        for (
            let currentTLink = 0;
            currentTLink < tLinks.length;
            currentTLink++
        ) {
            // Go to cloud website ...
            await downloadPage.goto(tLinks[currentTLink], {
                waitUntil: "networkidle0",
            });

            // Set Download Location ...
            await downloadPage.client.send("Page.setDownloadBehavior", {
                behavior: "allow",
                downloadPath: "L:/",
            });

            // Grab download link ...
            let download = await downloadPage.evaluate(() => {
                const dLink = document
                    .querySelector(
                        "#premium-file-links > div.premium-link-block"
                    )
                    .querySelector("a").href;
                return dLink;
            }); // console.log("download link:", download);

            console.log(`using this Turbobit link: "${download} \n`);

            // Click link
            await downloadPage.click(
                "#premium-file-links > div.premium-link-block a"
            );

            // Delay to allow other downloads to finish ...
            // Note: need a more elegant way to deal with this ... chrome may not allow us to evaluate active downloads
            // await downloadPage.waitForTimeout(2000);

            console.log(`👍 Downloaded ${url} succesfully! \n`);
        }
    } catch (error) {
        console.log(`🚨 5️⃣ goDownload error:`, error);
    }
}

app();

// ** Notes:
// const url = process.env.TARGET_LOGIN_LINK;
// 🤖 👋 👍✔️➰🏎️🌬️ 🚨 ✨📃 🔓 🤮 💀
// // Set Download Location
// await downloadPage.client.send("Page.setDownloadBehavior", {
//     behavior: "allow",
//     downloadPath: "L:/"
//   })
// L:\
// file:///L:/
//     downloadPath: path.resolve('', 'tmp')
// downloadPath: './myAwesomeDownloadFolder'
// await firstTab.goto("L:/", {
//     waitUntil: "networkidle0",
// });
