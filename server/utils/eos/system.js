import symbol from './symbol';
import { AsSet, asSetOfRamBytes } from './asset'
import assert from 'assert';


function mergeSystemFuncs(eos) {
    Object.assign(eos, {
        /**
         * get EOS system global info
         */
        getGlobalInfo() {
            return new Promise((resolve, reject) => {
                this.getTableRows({
                    scope: symbol.SYS_ACCOUNT,
                    code: symbol.SYS_ACCOUNT,
                    table: 'global',
                    json: true,
                    limit: 1
                }).then(result => {
                    resolve(result.rows[0]);
                }).catch(err => {
                    reject(err);
                })
            })
        },

    // getUserActions(accountName,pos=0,offset=5){
    //     return new Promise((resolve,reject)=>{
    //         this.getActions
    //     })
    // }
    })
}

module.exports = mergeSystemFuncs;