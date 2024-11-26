var express = require('express'),
    app = express(),
    passport = require('passport'),
    FacebookStrategy = require('passport-facebook').Strategy,
    session = require('express-session');

app.set('view engine', 'ejs');

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const mongourl= 'mongodb+srv://melon:Fb218144@cluster0.4rmln.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = '381Project';
const collectionName = 'Song List';
const client = new MongoClient (mongourl,{
	serverApi: {
	version: ServerApiVersion.v1,
	strict: true,
	deprecationErrors: true,
	}
});

const isProduction = process.env.NODE_ENV === 'production' || process.env.PORT;
const formidable = require('express-formidable');
app.use(formidable());
const fsPromises = require('fs').promises;

const addSong = async (db, doc) => {
var collection = db.collection (collectionName);
let results = await collection. insertOne(doc);
console.log("A song has been added to your song list:" + JSON.stringify(results));
return results;}

const searchSong = async (db, criteria) => {
    var collection = db.collection(collectionName);
    let results = await collection.find(criteria).toArray();
    console.log("Song found:" + JSON.stringify(results));
    return results;
};

const updateInfo = async (db, criteria, updateData) => {
    var collection = db.collection(collectionName);
    let results = await collection.updateOne(criteria, { $set: updateData });
    console.log("Song information updated:" + JSON.stringify(results));
    return results;
};

const deleteSong = async (db, criteria) => {
    var collection = db.collection(collectionName);
    let results = await collection.deleteMany(criteria);
    console.log("Song deleted: " + JSON.stringify(results));
    return results;
};

var user = {};
passport.serializeUser(function(user, done){done(null, user);});
passport.deserializeUser(function(id, done){done(null, user);});

app.use(session({
    secret: "tHiSiSasEcRetStr",
    resave: true,
    saveUninitialized: true}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new FacebookStrategy({
    clientID: '917269717006511',
    clientSecret: 'a2944e68a3babda9211778b15b697486',
    callbackURL: isProduction 
        ? 'https://online-shared-song-list.onrender.com/auth/facebook/callback'
        : 'http://localhost:8099/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'email'],
    enableProof: true
},
  function(token, refreshToken, profile, done) {
    console.log("Facebook Profile: " + JSON.stringify(profile));
    console.log(profile);
    user = {};
    user['id'] = profile.id;
    user['name'] = profile.displayName;
    user['type'] = profile.provider;
    console.log('user object: ' + JSON.stringify(user));
    return done(null, user);
   })	
);

app.use((req, res, next) => {
    let d = new Date();
    console.log(`TRACE: ${req.path} was requested at ${d.toLocaleDateString()}`);
    next();
});

const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated())
        return next();
    res.redirect('/login');
}

app.get("/login", function(req, res) {
    res.status(200).render('login');
});

app.get("/auth/facebook", passport.authenticate("facebook", { scope: "email" }));

app.get("/auth/facebook/callback",
    passport.authenticate("facebook", {
        successRedirect: "/content",
        failureRedirect: "/"
    })
);

app.get('/', isLoggedIn, (req, res) => {
    res.redirect('/content');
});

app.get("/content", isLoggedIn, function(req, res) {
    //res.render('list', { user: req.user });
    handle_Search(req, res, req.query.docs);
});

app.get('/create', isLoggedIn, (req, res) => {
    res.status(200).render('create', {user: req.user}); 
});

app.post('/create', isLoggedIn, (req, res) => {
    handle_Add(req, res);
});

app.get('/details', isLoggedIn, (req, res) => {
    handle_Info(req, res, req.query);
});

app.get('/edit', isLoggedIn, (req, res) => {
    handle_Edit(req, res, req.query);
});

app.post('/update', isLoggedIn, (req, res) => {
    handle_Update(req, res, req.query); 
});

app.get('/delete', isLoggedIn, (req, res) => {
    handle_Delete(req, res);  
});


app.get("/logout", function(req, res) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.post('/api/Song/:songName', async (req,res) => { //async programming way
    if (req.params.songName) {
        console.log(req.body)
	await client.connect();
	console.log("You have connected to MongoDB server");
	const db = client.db(dbName);
	let newSong = {
		songName: req.fields.songName,
		singer: req.fields.singer,
		songURL: req.fields.songURL
	};
	await addSong(db, newSong);
	res.status(200).json({"This song has been added to your song list":newSong}).end();
    } 
    else {
        res.status(500).json({"error": "missing song name"});
    }
})

app.get('/api/Song/:songName', async (req,res) => {
	if (req.params.songName) {
		console.log(req.body)
        	let criteria = {};
        	criteria['songName'] = req.params.songName;
		await client.connect();
		console.log("You have connected to MongoDB server");
		const db = client.db(dbName);
		const docs = await searchSong(db, criteria);
		res.status(200).json(docs);
	} else {
        res.status(500).json({"error": "missing song name"}).end();
    }
});

app.put('/api/Song/:songName', async (req,res) => {
    if (req.params.songName) {
        console.log(req.body)
	let criteria = {};
        criteria['songName'] = req.params.songName;
	await client.connect();
	console.log("You have connected to MongoDB server");
	const db = client.db(dbName);
	let updateData = {
		songName: req.fields.songName || req.params.songName,
		singer: req.fields.singer,
		songURL: req.fields.songURL
	};
	const results = await updateInfo(db, criteria, updateData);
	res.status(200).json(results).end();
    } else {
        res.status(500).json({"error": "missing song name"});
    }
})

app.delete('/api/Song/:songName', async (req,res) => {
    if (req.params.songName) {
	console.log(req.body)
	let criteria = {};
        criteria['songName'] = req.params.songName;
	await client.connect();
	console.log("You have connected to MongoDB server");
	const db = client.db(dbName);
	const results = await deleteSong(db, criteria);
        console.log(results)
	res.status(200).json(results).end();
    } 
    else {
        res.status(500).json({"error": "missing song name"});       
    }
})

const handle_Search = async (req, res, criteria) => {
    await client.connect();
    console.log("You have connected to MongoDB server");
    const db = client.db(dbName);
    const songs = await searchSong(db);
    res.status(200).render('list', { List: songs.length, Song: songs, user: req.user });
};

const handle_Add = async (req, res) => {
     await client.connect();
     console.log("You have connected to MongoDB server");
     const db = client.db(dbName);
     let newSong = {
	    userid: req.user.id,
            songName: req.fields.songName,
            singer: req.fields.singer,
            songURL: req.fields.songURL
     };
     await addSong(db, newSong);
     res.redirect('/');
}

const handle_Info = async (req, res, criteria) => {
     await client.connect();
     console.log("You have connected to MongoDB server");
     const db = client.db(dbName);
     let DOCID = { _id: ObjectId.createFromHexString(criteria._id) };
     const songs = await searchSong(db, DOCID);
     res.status(200).render('details', { Song: songs[0], user: req.user});
}

const handle_Edit = async (req, res, criteria) => {
     await client.connect();
     console.log("You have connected to MongoDB server");
     const db = client.db(dbName);
     let DOCID = { '_id': ObjectId.createFromHexString(criteria._id) };
     let songs = await searchSong(db, DOCID);
     if (songs.length > 0 && songs[0].userid == req.user.id) {
            res.status(200).render('edit', { Song: songs[0], user: req.user});
     } else {
            res.status(500).render('info', { message: 'Only the uploader of this song can edit the song information', user: req.user});
     }
}

const handle_Update = async (req, res, criteria) => {
     await client.connect();
     console.log("You have connected to MongoDB server");
     const db = client.db(dbName);
     const DOCID = {_id: ObjectId.createFromHexString(req.fields._id)}
     
     let updateData = {
     		       songName: req.fields.songName,
     		       singer: req.fields.singer,
     		       songURL: req.fields.songURL
     };
     let songs = await searchSong(db, DOCID);
     if (songs.length > 0 && songs[0].userid == req.user.id) {
     	    const results = await updateInfo(db, DOCID, updateData);
     	    res.status(200).render('info', {message: `Updated Song information`, user: req.user});
     }
     else{
     	    res.status(500).render('info',{message: 'Only the uploader of this song can update the song information', user: req.user})
     };
}

const handle_Delete = async (req, res) => {
     await client.connect();
     console.log("You have connected to MongoDB server");
     const db = client.db(dbName);
     let DOCID = { '_id': ObjectId.createFromHexString(req.query._id) };
     let songs = await searchSong(db, DOCID);
     if (songs.length > 0 && songs[0].userid == req.user.id) { 
            await deleteSong(db, DOCID);
            res.status(200).render('info', { message: `A song has been removed from your song list.`, user: req.user});
        } else {
            res.status(500).render('info', { message: 'Only the uploader of this song can delete the song(s)', user: req.user});
        }
}

app.get('/*', (req, res) => {
    res.status(404).render('info', { message: `${req.path} - Unknown request!` });
});

const port = process.env.PORT || 8099;
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});






