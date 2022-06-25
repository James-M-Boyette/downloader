// import puppeteer from "puppeteer";
import puppeteer from "puppeteer-extra";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";
import { url } from "inspector";
dotenv.config();

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
// const StealthPlugin = require('puppeteer-extra-plugin-stealth')
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

// Add adblocker plugin to block all ads and trackers (saves bandwidth)
// const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// Establish general params of app, and then invoke processes ...
async function app() {
    try {
        // ** GENERAL SETTINGS **
        const pageSize = { width: 1080, height: 1920 };

        // Evaluate what page(s) should be worked on ...
        //      For one page, put that page # twice; otherwise, put the first and last pages:
        //      Ex: for page #1 only, put (1, 1)
        //      Ex: for pages 3 - 5, put (3, 5)
        // const pagesArray = workScope(20, 20); // 👀 CHANGE THIS IF YOU WANT TO SET 'START' AND 'END' INDEX PAGES 👀
        const pagesArray = workScope(1, 1); // 👀 CHANGE THIS IF YOU WANT TO SET 'START' AND 'END' INDEX PAGES 👀
        // const pagesArray = workScope(80, 90); // 👀 CHANGE THIS IF YOU WANT TO SET 'START' AND 'END' INDEX PAGES 👀
        // const pagesArray = workScope(80, 80); // 👀 CHANGE THIS IF YOU WANT TO SET 'START' AND 'END' INDEX PAGES 👀

        // ** APP STARTUP **

        // Open a browser visible to a user (rather than headless):
        const browser = await puppeteer.launch({
            headless: false,
            ignoreHTTPSErrors: true,
        });

        // Block 'notifications' redirects
        const context = browser.defaultBrowserContext();
        // context.overridePermissions("https://3dcu.com/", ["notifications"]);
        // context.overridePermissions("https://3dcu.com/", [
        //     "--disable-notifications",
        // ]);
        context.overridePermissions("https://3dcu.com/", []);
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
            // ** ALL items on the page ...
            // let currentShowPage = 0; // 👀 CHANGE THIS IF YOU WANT TO START AT ANOTHER SHOW PAGE 👀
            // currentShowPage < linksList.length; // USE THIS IF YOU WANT TO DO EVERYTHING ON THE PAGE
            // ** ONE item ...
            // let currentShowPage = 1; // 👀 CHANGE THIS IF YOU WANT TO START AT ANOTHER SHOW PAGE 👀
            // currentShowPage <= 1; // 👀 USE THIS IF YOU NEED TO STOP BEFORE THE END OF THE PAGE 👀
            // ** A RANGE of items ...
            // let currentShowPage = 1; // 👀 CHANGE THIS IF YOU WANT TO START AT ANOTHER SHOW PAGE 👀
            // currentShowPage <= 15; // USE THIS IF YOU WANT TO DO EVERYTHING ON THE PAGE
            // ** A RANGE of items ...
            let currentShowPage = 3; // 👀 CHANGE THIS IF YOU WANT TO START AT ANOTHER SHOW PAGE 👀
            currentShowPage <= 3; // USE THIS IF YOU WANT TO DO EVERYTHING ON THE PAGE
            currentShowPage++
        ) {
            const url = linksList[currentShowPage]; // console.log("url:", url);

            // Go to the given 'Show' page ...
            await downloadPage.goto(`${url}`, {
                waitUntil: "load",
                timeout: 0,
            });

            await pwCheckNLog(downloadPage);

            // ** GRAB CLOUD LINK(S) **
            let tLinks = await getTLinks(downloadPage); // console.log(`The result tLinks from tLinkArray:`, tLinks);

            console.log(
                `${currentShowPage}) Downloading sharing site's item "${url}" -
                \n #${currentShowPage} in our linkList, or #${
                    currentShowPage + 1
                } of the current 'Index' page, \n`
            );

            // ** GO TO CLOUD LINK(S) **
            await goDownload(downloadPage, tLinks, url);

            // CRASH soln: Check whether we have too many or too few cloud links ...
            if (tLinks.length > 1) {
                // If too many, set a delay of 1 min to let them finish ...
                await downloadPage.waitForTimeout(45000); // NEEDS to happen *after* download of these links, so there's time for theme to resolve
            } else if (tLinks.length < 1) {
                // If too few, log the failed 'show' page for future review ...
                console.error(`🚨💀 No cloud links were found - \n
                Check ${url} `);
                failedPages.push(url);
            }

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

// Check if a password is provided on the 'show' page, and log it (if it exists) to passwords.txt ...
async function pwCheckNLog(downloadPage) {
    let pwExists = await downloadPage.evaluate(() => {
        if (
            document.body.textContent.includes("Password") ||
            document.body.textContent.includes("PASSWORD") ||
            document.body.textContent.includes("password")
        ) {
            return true;
        } else {
            return false;
        }
    }); // console.log("pwExists results:", pwExists);

    if (pwExists) {
        let password = await downloadPage.evaluate(() => {
            let siteText = document.body.querySelector(
                `[style*="text-align:left"]`
            );
            const m = new Date();
            const dateTime =
                m.getUTCFullYear() +
                "/" +
                (m.getUTCMonth() + 1) +
                "/" +
                m.getUTCDate() +
                " " +
                m.getUTCHours() +
                ":" +
                m.getUTCMinutes() +
                ":" +
                m.getUTCSeconds();
            siteText = `\n` + `\n` + dateTime + `\n` + siteText.innerText;
            // return siteText ? siteText : "";
            return siteText;
        }); // console.log("password:", typeof password, password);

        fs.appendFile(
            "./logs_&_errors/passwords.txt",
            password,
            function (err) {
                if (err) {
                    console.log(`🚨 Password file write failed ...`);
                } else {
                    console.log(`🔐 Password file written!`);
                }
            }
        );
    }
}

// Check what (if any) cloud hosting domain is being used, and return all matching links ...
async function getTLinks(downloadPage) {
    try {
        let tLinkArray = await downloadPage.evaluate(() => {
            const tLinkRoots = [
                "https://turb.pw",
                "https://turbobit.net",
                "https://turb.cc",
            ]; // Possible URLs:
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
async function goDownload(downloadPage, tLinks, url) {
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
            const downloadTo = process.env.DOWNLOAD_LOCATION;

            console.log(
                "🎉🎉🎉🎉🎉 downloadTo: ",
                typeof downloadTo,
                downloadTo
            );

            await downloadPage._client.send("Browser.setDownloadBehavior", {
                behavior: "allow",
                // downloadPath: "L:\\", // "To be installed" folder
                downloadPath: downloadTo, // "To be installed" folder
                // downloadPath: "L:/",
            });

            // Grab download link ...
            let download = await downloadPage.evaluate(() => {
                // OPT #1
                // const dLink = document
                //     .querySelector(
                //         "#premium-file-links > div.premium-link-block"
                //     )
                //     .querySelector("a").href;
                // return dLink;
                // OPT #2
                // const dLink = document
                //     .querySelector("#premium-file-links > div:nth-child(1)")
                //     .querySelector("a").href;
                // return dLink;
                // OPT #3
                const dLink = document.querySelectorAll(
                    ".shorturl-link > input"
                )[0].value;
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
