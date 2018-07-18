/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import deploy from '../../helpers/deploy';
import {APOLLO, ATLAS, HERMES} from '../../../src/consts';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('RolesStore Contract', () => {
  let web3;
  let from;
  let atlas;
  let hermes;
  let apollo;
  let other;
  let rolesStore;
  let kycWhitelist;

  const setRole = async (node, role, sender = from) => rolesStore.methods.setRole(node, role).send({from: sender});
  const setUrl = async (node, url, sender = from) => rolesStore.methods.setUrl(node, url).send({from: sender});
  const getRole = async (node) => rolesStore.methods.getRole(node).call();
  const getUrl = async (node) => rolesStore.methods.getUrl(node).call();

  beforeEach(async () => {
    ({web3, rolesStore, kycWhitelist} = await deploy({web3, contracts: {rolesStore: true, kycWhitelist: true, config: true}}));
    [from, atlas, hermes, apollo, other] = await web3.eth.getAccounts();
    await kycWhitelist.methods.add(hermes, HERMES).send({from});
    await kycWhitelist.methods.add(atlas, ATLAS).send({from});
    await kycWhitelist.methods.add(apollo, APOLLO).send({from});
  });

  describe('Roles', () => {
    it('sets roles correctly', async () => {
      await setRole(hermes, HERMES);
      expect(await getRole(hermes)).to.equal(HERMES.toString());
    });

    it('throws when setting a role not permitted by KYC', async () => {
      await expect(setRole(hermes, APOLLO)).to.be.eventually.rejected;
    });

    it('is contextInternal', async () => {
      await expect(setRole(hermes, HERMES, other)).to.be.eventually.rejected;
    });
  });

  describe('URL', () => {
    const url = 'https://google.com';

    beforeEach(async () => {
      await setRole(hermes, HERMES);
      await setRole(apollo, APOLLO);
    });

    it('sets url correctly', async () => {
      await setUrl(hermes, url);
      expect(await getUrl(hermes)).to.equal(url);
    });

    it('cannot add url if role was not set', async () => {
      await expect(setUrl(atlas, url)).to.be.eventually.rejected;
      await setRole(atlas, ATLAS);
      await expect(setUrl(atlas, url)).to.be.eventually.fulfilled;
      expect(await getUrl(atlas)).to.equal(url);
    });

    it('cannot add url to the apollo node', async () => {
      await expect(setUrl(apollo, url)).to.be.eventually.rejected;
    });

    it('can add long urls', async () => {
      const veryLongUrl = 'https://longurlmaker.com/go?id=FFXANFEYVADGCOWJWGZLNHQJSTNVXMVDRTDEYICUIGBLUYUREUDRBTBUNOPKALNRERVDZYXHEZTZXNQCITUJNVDBJTMKEABJRXMRWKZBJSAHGRJOLDYYZCAIVMTANUJESWWOHWPROPYVHHJSLIQKKRTGDMHQHQVZNSNUODLDSKYASISERJPBAIIEVPVDGRCTJQOYTABMKAMDJFHAOWCOFKSAZNEGEHZOYOMRPOEAORDXWKYLGAZLKSMKFQQKYQZWFLOUZTUOKXMHIKSOKSAVKNGQEXBCNAYSLMNLFHAQFMYNXRBIJCDUPKKTHLVVMUOYHBJNJKEOWCBTUDBEGFYVQJPXVLTHFIFMJPATZEHWGJPBNRFTXDPNNELIQEPVMUIWKIQJMXFTHVVVMAPJEEXRJIZZNOVZJEWTMMDZKJTSEONRPCBTHYKRGKQTZMTIQPCCCGCNPWFTKTKZWLTDKDVQOMJNYDWOTZRVFUJUQOOAIZAELTIVXDLLPVZOYVCSUTNZNXUEMIFUHFZSZHOXLZJBVIPUESMZMAZAXTEJCJEJPDCPLQMWQVYMEOGJGSISTHSQAWADGEMVIPKTGXQXTOJYDPHJIPCCWUTXRTAYYNUGDFAJCQHVFQTIGARPQTRNOLLGELEDZYKDDKNGBUBGKVPRWHGNBYAPJLWOXASXZDACNNIPHKWSGLJCTQPUPQKZBGOZHGWGJWIXJRMRCJJIVTLOKBIARSZTYOSFUOMEKUBUMOLOYVXTPIHAJPABHAUGOMMJAYNLTPGGESVCNSVDBCDLSEMAEGHTSTCTSQFMFLSJDNMRGHUHKYSCCECGLJAEDCYWSDIYPAISOUKUCFCMDVPFZSMLCMPFPNBIRKGGKPZZJJTLOWYSRNXRFJCIWSNLFPTXAZDKPCJYMDKBZJTRWRICAKKWCYIIOBFOBJZQMJPZNZANIUEFLMIMXTJZSRIHSOWTYVKKFZJSYKFHFJNQWVDTPMTHEBOWQKQOGAYLAIEZSJGYTUOQPSJEECMIDAFTLWIRXGDXPHWIRDGLXUBNMKSRMEAQFGKQCSIAZMXOTUWLYDXVYYIKJBCWFDNKJYBLQKLQWJFQDCBCFYXDXGOHHRDNURYDPZPGKAXGKCWOEXQKWONUUCBCTFPNXOQMOFTYGQERSAFXYWHVKVQFYRHRXXEULVHZBAYIQCZJDFHCBPYMLORJGZADWFYIBGICGGLXJKHMQOOSDMEOAWXHVYKSEJBFPJHWQSTZDBLTPAMTNQIOMFVIEGBIPCNFLVBCOUBSVMLLNYEBOMPBSKKXRLFGNTLZONBDICVEPHPDFUEUHTVAEGXWRDCEWOELCGOKJKOYRDCXYGRFANFFTCBKGEPCTUNVACFJNUIFYKCWRUCSHHYBKZMQECTXWHTXKZHXTPDSAFOSARLIZJJJIWANYULVBETMEAJYQMQQSFJSWUAVDKFMHGZFAKBCPUOTVYSLKICDNLWKFXFIHKVOQUURFWTURHOMFHYQPAUDLQNRNTAVEVKVQFMVBFQTNEGTMEKBEEFQVTIIMIEQEOLUUYPVEFORKULWZVYEAEUVXDEKLIAQXMKRKANOFCGQXRNWNMANQVINYNXKVYASLKKVLXKQZRHXJVTWHUKXPTKOGIYCGZVRJFNUDYLCPTAZOTWWNGTDAERGMPITPDKZJYUMXFPNZPMOIIKWPDZPIRWUHFOWIZVSXPEUVTHUJUJSCTOSXOHFFEANJOJSNEKKTPFOJNJSHSKKLZCJOKOUOOHYDQQQUABOPGDZUMRBECMQCPZQZOLODSMGJCWEDXSTEVSZIKBMMNDPCDFCRRQUKDATGXXJVQDAMWZUGAHTNLIQOOSFFIZQLAJRYHBTYFTKBTFITNCHYLXMZPSFYRVKSFCQMDKLJEWLXBTQPWYNHVAHLSNJKJUCOWTBADMJHJUFKOWZLUNSQNABGNLQXGTLCMNCQAMYJHDUWAUHUIALVANCOYSLELXHYLKOMWNVDQQAQKHLSIWOJJQXIJJNUHVTSFHEBUAFLRFCBNOUWLJFVADEKNRFUNYNSFSUASAMJ';
      await setUrl(hermes, veryLongUrl);
      expect(await getUrl(hermes)).to.equal(veryLongUrl);
    });

    it('can add urls with unicode', async () => {
      const unicodeUrl = 'https://emoji.com/😀🔥';
      await setUrl(hermes, unicodeUrl);
      expect(await getUrl(hermes)).to.equal(unicodeUrl);
    });

    it('is contextInternal', async () => {
      await expect(setUrl(hermes, url, other)).to.be.eventually.rejected;
    });
  });
});
