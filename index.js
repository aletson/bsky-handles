const Discord = require('discord.js');
const { SlashCommandBuilder, GatewayIntentBits, Partials } = require('discord.js');
const client = new Discord.Client({ intents: [GatewayIntentBits.Guilds], partials: [Partials.GuildMember], });
let fetch = require('node-fetch');
let { BskyAgent } = require('@atproto/api')
let domain = process.env.domain;

let agent = new BskyAgent({
    service: 'https://bsky.social'
})

client.login(process.env.app_token);
agent.login({
    identifier: process.env.bsky_user,
    password: process.env.bsky_pw
})
let locks = [];

client.on('ready', async () => {

    let customhandle = new SlashCommandBuilder().setName('customhandle')
        .setDescription('Use a custom subdomain (not your name) for your Bluesky handle.')
        .addStringOption(option =>
            option.setName('did')
                .setDescription('Custom value from your Change Handle page, e.g. did=did:plc:xxxxxxxxxxxx')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('handle')
                .setDescription(`Custom handle, e.g. "sample" if you want @sample.${domain}`)
                .setRequired(true));


    await client.application.commands.set([customhandle.toJSON()]);
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
        let did = interaction.options.getString('did');
        let handle = interaction.options.getString('handle').toLowerCase();
        let lockExists = locks.find(l => handle === l.handle && l.lock > Date.now());
        try {
            let thisHandleExists = await agent.getProfile({ actor: `${handle}.${domain}` }); // check if handle exists in Bluesky
            if (!thisHandleExists) { //handle does not exist in bluesky
                if (!lockExists) {
                    let pb_body = {
                        apikey: process.env.pb_apikey,
                        secretapikey: process.env.pb_secretkey
                    }
                    const response = await fetch(`https://porkbun.com/api/json/v3/dns/retrieveByNameType/${domain}/TXT/_atproto.${handle}`, { // check if subdomain exists
                        method: 'post',
                        body: JSON.stringify(pb_body),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    let exists = response.json();
                    if (typeof exists.records !== 'undefined' && exists.records.length > 0) { // if subdomain exists, edit, because handle isn't valid right now in Bluesky. potential issue here where someone request a handle, doesn't verify, then someone else requests the same handle
                        let pb_body = {
                            apikey: process.env.pb_apikey,
                            secretapikey: process.env.pb_secretkey,
                            name: `_atproto.${handle}`,
                            type: "TXT",
                            content: did,
                            ttl: 600
                        };
                        const response = await fetch(`https://porkbun.com/api/json/v3/dns/edit/${domain}/${exists.records[0].id}`, {
                            method: 'post',
                            body: JSON.stringify(pb_body),
                            headers: { 'Content-Type': 'application/json' }
                        });
                        const data = await response.json();
                        await interaction.reply('New handle is set up.');
                    } else {
                        let pb_body = {
                            apikey: process.env.pb_apikey,
                            secretapikey: process.env.pb_secretkey,
                            name: `_atproto.${handle}`,
                            type: "TXT",
                            content: did,
                            ttl: 600
                        };
                        const response = await fetch(`https://porkbun.com/api/json/v3/dns/create/${domain}`, {
                            method: 'post',
                            body: JSON.stringify(pb_body),
                            headers: { 'Content-Type': 'application/json' }
                        });
                        const data = await response.json();
                        interaction.reply({ content: 'Your handle should be set up at ' + handle + '.' + domain + ' in approximately five minutes. Please make sure you set up the handle within 30 minutes or it will be released for free registration.', ephemeral: true });
                        locks.push({ handle: handle, lock: Date.now() + 1800000 });
                    }
                } else {
                    interaction.reply({ content: 'This handle is currently locked for registration. If the user who has locked it does not register it on Bluesky within 30 minutes of their claiming the handle via this bot, it will be released again for registration.', ephemeral: true });
                }
            } else { // handle exists in Bluesky
                interaction.reply({ content: 'Someone has already taken this handle on Bluesky, sorry.', ephemeral: true });
            }
        } catch (e) {
            console.log(e);
            if (e.message == 'Profile not found') { // handle does not exist
                if (!lockExists) {
                    let pb_body = {
                        apikey: process.env.pb_apikey,
                        secretapikey: process.env.pb_secretkey
                    }
                    const response = await fetch(`https://porkbun.com/api/json/v3/dns/retrieveByNameType/${domain}/TXT/_atproto.${handle}`, { // check if subdomain exists
                        method: 'post',
                        body: JSON.stringify(pb_body),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    let exists = await response.json();
                    console.log(exists);
                    if (exists.records.length > 0) { // if subdomain exists, edit, because handle isn't valid right now in Bluesky. potential issue here where someone request a handle, doesn't verify, then someone else requests the same handle
                        let pb_body = {
                            apikey: process.env.pb_apikey,
                            secretapikey: process.env.pb_secretkey,
                            name: `_atproto.${handle}`,
                            type: "TXT",
                            content: did,
                            ttl: 600
                        };
                        const response = await fetch(`https://porkbun.com/api/json/v3/dns/edit/${domain}/${exists.records[0].id}`, {
                            method: 'post',
                            body: JSON.stringify(pb_body),
                            headers: { 'Content-Type': 'application/json' }
                        });
                        const data = await response.json();
                        await interaction.reply({ content: 'Your handle should be set up at ' + handle + '.' + domain + ' in approximately five minutes. Please make sure you set up the handle within 30 minutes or it will be released for free registration.', ephemeral: true });
                        locks.push({ handle: handle, lock: Date.now() + 1800000 });
                    } else {
                        let pb_body = {
                            apikey: process.env.pb_apikey,
                            secretapikey: process.env.pb_secretkey,
                            name: `_atproto.${handle}`,
                            type: "TXT",
                            content: did,
                            ttl: 600
                        };
                        const response = await fetch(`https://porkbun.com/api/json/v3/dns/create/${domain}`, {
                            method: 'post',
                            body: JSON.stringify(pb_body),
                            headers: { 'Content-Type': 'application/json' }
                        });
                        const data = await response.json();
                        interaction.reply({ content: 'Your handle should be set up at ' + handle + '.' + domain + ' in approximately five minutes. Please make sure you set up the handle within 30 minutes or it will be released for free registration.', ephemeral: true });
                        locks.push({ handle: handle, lock: Date.now() + 1800000 });
                    }
                } else {
                    interaction.reply({ content: 'This handle is currently locked for registration. If the user who has locked it does not register it on Bluesky within 30 minutes of their claiming the handle via this bot, it will be released again for registration.', ephemeral: true });
                }
            }
        }
    }
});