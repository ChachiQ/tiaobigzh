import path from 'path';
var pwdFileName = path.format({ //the context path of last run
    dir: __dirname,
    base: '.pwd'
})
var pwd = JSON.parse(require('fs').readFileSync(pwdFileName));

module.exports = {
    debug: true,
    wetchat: {
        token: pwd.tbgzh.token,
        appid: 'wx02c5e8fb3942e664',
        appSecret: pwd.tbgzh.appSecret,
        encodingAESKey: pwd.tbgzh.encodingAESKey,
        checkSignature: true // 可选，默认为true。由于微信公众平台接口调试工具在明文模式下不发送签名，所以如要使用该测试工具，请将其设置为false
    },
    //配置公众号菜单
    gzhMenu: {
        "button": [
            {
                "type": "click",
                "name": "今日歌曲",
                "key": "V1001_TODAY_MUSIC"
            },
            {
                "name": "菜单",
                "sub_button": [
                    {
                        "type": "view",
                        "name": "搜索",
                        "url": "http://www.soso.com/"
                    },
                    {
                        "type": "click",
                        "name": "赞一下我们",
                        "key": "V1001_GOOD"
                    }]
            }]
    },
    eos: {
        currenv: 'eosnewyork',
        envs: [
            {
                name: 'jungle',
                type: "testnet", //mainnet,local,testnet
                endpoint: 'http://jungle.cryptolions.io:38888',
                chainId: '038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca',
                writeable: true, //是否可以写操作，写操作才需要钱包信息
                wallet: pwd.jungleTestnetWallet
            },
            {
                name: 'eosnewyork',
                type: 'mainnet',
                writeable: false,
                endpoint: 'http://api.eosnewyork.io:80',
                chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
                writeable: false,
            }
        ],
        getEnv() {
            let that = this;
            return this.envs.find((val) => {
                return val.name.toLowerCase() === that.currenv.toLowerCase();
            })
        }
    },
    crawler: {
        elasticsearchHost: 'https://search-tiaobi-3ano6ueiveimwf6ce7r2qjajei.ap-northeast-1.es.amazonaws.com',
    }
}