## Faq guide for Void
 <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCG1Ejs__vHbFp6Gah9NMUnSyMu6d---oGcw&usqp=CAU" alt="troubleshooting banner" border="0">
<div align="center"> <br>
Nothing is perfect in the world or is made perfect, and so is our little project void is. So here we're providing you the troubleshooting guide to save your soul :v <br>

<div align="left"><br>


## 1) Types of error one can get on Void
- There's not so many errors our repo can give you but a few of them are there and mostly they're the common reason why your bot is malfunctioning.
- Errors depends on the method you're hosting void, one is Selfhosting on your pc💻 and other is on heroku deploy🌐
- Lets look at both in details shall we?

## 🌐Heroku Deployers errors troubleshooting guide
<Img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJwWh4muBfNGlWaTO3DL_X0bj3qSVraQehPQ&usqp=CAU" border="0" height="100" width="1000"><br>
<Div align="center">Since you're hosting it on cloud using heroku, one can't have the error regarding bot files being corrupted or altered by any means. So chill, there's nothing to fear about..read all the faqs from now carefully!<br>
<Div align="left">

<Br><strong>1) Why is my app showing application error upon clicking open app?</strong>
<Br> 
- The possible error can be within your mongo_URI, cross check if you've written the correct password in the secret string defined on your config vars.</li>
- Added to that there's possiblity that your URi isn't giving ip access, in such cases, go to your cluster's setting and check the <strong>'network access' tab</strong>, and open your cluster's ip. If the given ip isn't public then do it but clicking on "allow access from anywhere" option on the dialogue box
 If you've done it then refreshing your heroku's page shall fix the problem.</li>
- Another error can be "no web processes running". Well this is a very simple error that might have been accidentally caused. If we explain what's it then the fact is, on heroku there's a option called "web npm start" which starts the web processes to launch your application. When it's turned off, this error surfaces. You can simply re enable it by clicking on the configure dynos option and then hitting the on button.

<Br><strong>2)What is Error R15: Memory quota exceeded?</strong>

- Well so this error is something one may get several days after they're constantly running their application for days or weeks. To explain in terms of technical, this error surfaces when your bot stacks up with too much of cache and no space is left for functioning properly. To fix this error all you've to do in case of heroku is just to do is to click on <strong> Restart all dynos</strong> option. After a few seconds or minutes (depending on your network speed) you'll find the logs saying "app all ready to go". Your error"s fixed :v

<Br><Strong>3)Why I can't verify my SESSION_ID?</strong>
- There's a minor reasons that your app is throwing this error while verification of qr. The most common is that you're typing the wrong id? Cross check the spelling of your specified session and try again.

<Br><strong>3)How can i fix "Qr code isn't generated yet" error?</strong>
- The reason is that your qr session has expired after verifying it previously. The only way to fix this minor error would be to change your session id on config vars and then open the app and scan the freshly generated qr to launch it.

<Br><strong>4)How can i fix "cannot get client/qr" error</strong>
- Simply refresh your page to get the qr code or it's already verified then the message "you're already authenticated" :v

<Br><strong>5) Why i can't scan my qr for connecting?</strong>
- This error can surface either when Baileys library has updated or WhatsApp web is, for fixation you gotta re deploy your app from heroku.

