'use strict';

const HELPER_BASE = process.env.HELPER_BASE || '../../helpers/';
const Response = require(HELPER_BASE + 'response');

const base_url_html = '【WebコンテンツのURL】';

const TABLE_NAME = "【DynamoDBのテーブル名】";
const LIST_LIMIT = 20;

var last_post = -1;

const {
	conversation,
	Canvas
} = require('@assistant/conversation')

const app = conversation({ debug: false });

app.handle('myname', async conv => {
    console.log(conv);
		conv.add('ねえねえ、の後に伝えたい言葉を言ってください。');
		conv.add(new Canvas({
			data: {
			}
		}));
});
app.handle('continue', async conv => {
	console.log(conv);
	conv.add('ねえねえ、の後に伝えたい言葉を言ってください。');
	conv.add(new Canvas({
		data: {
		}
	}));
});

app.handle('talk', async conv => {
    console.log(conv.intent.params);
    console.log(conv.context.canvas);

		conv.add('はい、次どうぞ。');
		if( conv.intent.params.talk ){
			var post_time = await put_chat(conv.context.canvas.state.room, conv.context.canvas.state.character, conv.intent.params.talk.resolved);
			conv.add(new Canvas({
					data: {
							post_time: post_time
					}
			}));
		}
});

app.handle('sign', async conv => {
	console.log(conv.intent.params);
	console.log(conv.context.canvas);

	conv.add('はい、次どうぞ。');
	if( conv.intent.params.talk ){
		var post_time = await put_chat(conv.context.canvas.state.room, conv.context.canvas.state.character, undefined, conv.intent.params.sign.resolved);
		conv.add(new Canvas({
				data: {
						post_time: post_time
				}
		}));
	}
});

app.handle('start', conv => {
	console.log(conv);
	conv.add('キャラクタを選択してください。');

	if (conv.device.capabilities.includes("INTERACTIVE_CANVAS") ){
		conv.add(new Canvas({
			url: base_url_html + '/chatcanvas/index.html',
//			continueTtsDuringTouch: true,
			enableFullScreen: true
		}));
	}else
	if (conv.device.capabilities.includes("RICH_RESPONSE")) {
		conv.add('キャラクタを選択してください。');
	}else{
		conv.scene.next.name = 'actions.scene.END_CONVERSATION';
		conv.add('この端末はディスプレイがないため対応していません。');
	}
});

app.handle('no_match', async conv => {
	console.log(conv);
	conv.add('もう一度言ってください。');
});

exports.fulfillment = app;


const AWS = require("aws-sdk");
AWS.config.update({
  region: "ap-northeast-1",
});
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
	var body = JSON.parse(event.body);
	console.log(body);

	switch(event.path){
		case '/chatcanvas-put-chat':{
			var time = await put_chat(body.room, body.character, body.message, body.sign);
			var result = {
				status: 'ok',
				time: time,
			};
			return new Response(result);
		}
		case '/chatcanvas-get-chat':{
			if( !body.end )
				body.end = new Date().getTime();
			var list = await get_chat(body.room, body.start, body.end);
			var result = {
				status: 'ok',
				list: list,
				time: body.end,
			};
			console.log(result);
			return new Response(result);
		}
	}
};

async function put_chat(room, character, message, sign)
{
	var time = new Date().getTime();

	if( !message && !sign )
		return time;

	var params_put = {
		TableName: TABLE_NAME,
		Item:{
			room: room,
			post_time: time,
			"character": character,
		},
//		ConditionExpression: 'attribute_not_exists(firstkey)',
	};
	if( message )
		params_put.Item.message = message;
	if( sign )
		params_put.Item.sign = sign;
//	console.log(params_put);
	var result = await docClient.put(params_put).promise();
	last_post = time;

	return time;
}

async function get_chat(room, start, end)
{
	if( last_post >= 0 && last_post < start )
		return [];

	var params_query = {
		TableName: TABLE_NAME,
		ExpressionAttributeNames: {
			'#firstkey': 'room',
			'#secondkey': 'post_time'
		},
		ExpressionAttributeValues: {
			':firstValue': room,
			':secondValue_start': start,
			':secondValue_end': end,
		},
		ScanIndexForward: false,
		Limit : LIST_LIMIT,
		KeyConditionExpression: '#firstkey = :firstValue AND #secondkey BETWEEN :secondValue_start AND :secondValue_end',
	};
//		console.log(params_query);
		var result = await docClient.query(params_query).promise();
		if( result.Count > 0 )
			return result.Items.reverse();
		else
			return [];
}
