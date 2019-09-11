/**
 * Created by Andste on 2017/8/1.
 */
import { Image } from 'react-native';
import Zhugeio from 'react-native-plugin-zhugeio';
import { IsIos } from './Screen';
import BuildConfig from 'react-native-build-config';
import { NativeModules, Alert, AsyncStorage } from 'react-native';
import { I18n } from '../language/i18n';
import JPushModule from 'jpush-react-native';
import { Toast } from '../components/Toast';
import { APP_NAME, APP_CH_NAME, WechatAppId, IOSCHANNEL, ENV, Min_Program } from '../APP_CONFIG';
import DeviceInfo from 'react-native-device-info';
import { ShareModal } from '../components/Shuang/ShareModal';
import * as WeChat from 'react-native-wechat';
import { MALL_HOST } from '../APP_CONFIG'
import HomeInfo from '../api/HomeApi';
import RoomApi from '../api/RoomApi';
import NavigationService from '../navigator/NavigationService';
import Permissions from 'react-native-permissions';
import AndroidOpenSettings from 'react-native-android-open-settings';
import CacheApi from '../api/CacheApi';
import CacheConfig from './CacheConfig'
import Fetch from './Fetch';
import constObj from '../nim/store/constant';

const Foundation = {};
WeChat.registerApp(WechatAppId);

/**
 * 参数序列化
 * @type {{get: (function(*=)), post: (function(*))}}
 */
Foundation.sequence = {
  /**
   * 用于get的参数序列化
   * @param object
   * @returns {string}
   */
  get: (object) => {
    let url: string = '';
    typeof object === 'object' && (() => {
      for (let key in object) {
        if (object.hasOwnProperty(key)) {
          let _object = object[key];
          _object !== null && _object !== undefined && (url += '&' + key + '=' + _object);
        }
      }
      url = '?' + url.substring(1);
    })();
    return url;
  },
  /**
   * 用于post的参数序列化
   * @param params
   * @returns {string}
   */
  post: (params) => {
    if (!params) return;
    let formDara = new FormData();
    Object.keys(params).forEach(key => {
      let _value = params[key];
      Array.isArray(_value)
        ? _value.forEach(item => {
          (item !== null && item !== undefined) && formDara.append(key, item);
        })
        : (_value !== null && _value !== undefined) && formDara.append(key, _value);
    });
    return formDara;
  }
};

/**
 * 处理数字 1000 -> 1k
 * @param number
 * @returns {*|number}
 */
Foundation.handleNumber = number => {
  let __fun = (size, str) => {
    let __ = (number / size).toFixed(2);
    if (__.substr(__.length - 2, 2) === '00') {
      return __.substr(0, __.length - 3) + str;
    }
    return __ + str;
  };
  let _num = number || 0;
  _num > 1000 && (_num = __fun(1000, 'k'));
  return _num;
};

/**
 * 处理unix时间戳，转换为可阅读时间格式
 * @param unix
 * @param format
 * @returns {*|string}
 */
Foundation.unixToDate = (unix, format) => {
  if (typeof unix !== 'number') return unix;
  let _format = format || 'yyyy-MM-dd hh:mm:ss';
  let d = new Date(unix * 1000);
  let o = {
    "M+": d.getMonth() + 1,
    "d+": d.getDate(),
    "h+": d.getHours(),
    "m+": d.getMinutes(),
    "s+": d.getSeconds(),
    "q+": Math.floor((d.getMonth() + 3) / 3),
    "S": d.getMilliseconds()
  };
  if (/(y+)/.test(_format)) _format = _format.replace(RegExp.$1, (d.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (let k in o) if (new RegExp("(" + k + ")").test(_format)) _format = _format.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return _format;
};

/**
 * 把date事件转为秒为单位的unix时间戳
 * @param date YYY-MM-DD
 */
Foundation.dateToUnix = date => {
  let new_str = date.replace(/:/g, "-");
  new_str = new_str.replace(/ /g, "-");
  let arr = new_str.split("-");
  let datum = new Date(Date.UTC(arr[0], arr[1] - 1, arr[2], arr[3] - 8 || -8, arr[4] || 0, arr[5] || 0));
  return datum.getTime() / 1000;
};

/**
 * 深拷贝一个对象或数组
 * @param object
 * @returns {*}
 */
Foundation.deepClone = object => {
  let str, newobj = object.constructor === Array ? [] : {};
  if (typeof object !== 'object') {
    return;
  } else if (window.JSON) {
    str = JSON.stringify(object);
    newobj = JSON.parse(str);
  } else {
    for (let i in object) {
      if (object.hasOwnProperty(i)) {
        newobj[i] = typeof object[i] === 'object' ? Foundation.deepClone(object[i]) : object[i];
      }
    }
  }
  return newobj;
};

/**
 * 货币格式化
 * @param price
 * @returns {string}
 */
Foundation.formatPrice = price => {
  return String(Number(price).toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * 手机号隐私保护
 * @param mobile
 * @returns {*}
 */
Foundation.secrecyMobile = mobile => {
  if (!/\d{11}/.test(mobile)) {
    return mobile;
  }
  return mobile.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3');
};

/**
 * 计算现在到某个时间的倒计时 天、时、分、秒
 * @param unix
 * @returns {{day: *, hours: *, minutes: *, seconds: *}}
 */
Foundation.countdown = unix => {

  const leftTime = (time) => {
    if (time < 10) time = "0" + time;
    return time + '';
  };
  const _unix = unix - new Date() / 1000;
  return {
    day: leftTime(parseInt(_unix / 60 / 60 / 24, 10)),
    hours: leftTime(parseInt(_unix / 60 / 60 % 24, 10)),
    minutes: leftTime(parseInt(_unix / 60 % 60, 10)),
    seconds: leftTime(parseInt(_unix % 60, 10))
  }
};

/**
 * 计算现成的秒数 倒计时 天、时、分、秒
 * @param seconds
 * @returns {{day: *, hours: *, minutes: *, seconds: *}}
 */
Foundation.countTimeDown = seconds => {
  const leftTime = (time) => {
    if (time < 10) time = "0" + time;
    return time + '';
  };

  return {
    day: leftTime(parseInt(seconds / 60 / 60 / 24, 10)),
    hours: leftTime(parseInt(seconds / 60 / 60 % 24, 10)),
    minutes: leftTime(parseInt(seconds / 60 % 60, 10)),
    seconds: leftTime(parseInt(seconds % 60, 10))
  }
};

/**
 * 过滤字符串左右空格
 */
Foundation.trim = (str) => {
  return str && str.length > 0 ? str.replace(/(^\s*)|(\s*$)/g, "") : ''
}

/***
 * 计算当前时间到第二天0点的倒计时[秒]
 * @returns {number}
 */
Foundation.theNextDayTime = () => {
  const nowDate = new Date();
  const time = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 1, 0, 0, 0).getTime() - nowDate.getTime();
  return parseInt(time / 1000)
};

/**
 * 获取用户本地持久化BearToken
 */
Foundation.getToken = () => {
  global.storage.load({ key: 'token' })
    .then(data => {
      global.authorization = data
      global.isLogin = data && data.length > 0 ? true : false
    }).catch(err => {
      console.log(err.message);
    })
}

/**
 * 数据统计，诸葛
 * @param eventName
 * @param object
 */
Foundation.stat = (eventName, options) => {
  console.log(options, 'options')
  options = {
    site: APP_NAME,
    utm_source: IsIos ? IOSCHANNEL : BuildConfig.FLAVOR,
    PlatformType: IsIos ? 'ios' : 'android',
    isLogin: global.isLogin,
    userId: global.userId || '',
    userChannel: global.channel || 'guangwang',
    appVersion: DeviceInfo.getVersion(),
    ...options
  }
  Zhugeio.track(eventName, options);
}

Foundation.statIdentify = (userId, options) => {
  Zhugeio.identify(userId + '', options)
}

/**
 * 是否可以json成功
 * @param eventName
 * @param object
 */
Foundation.isJson = (params) => {
  if (typeof params == 'string') {
    try {
      JSON.parse(params);
      return true;
    } catch (e) {
      return false;
    }
  } else {
    return false
  }
}

//过滤banner数据 1全体用户展示，2IOS用户展示，3Android用户展示
Foundation.filterBannerList = (bannerList) => {
  bannerList = bannerList.filter((item) => {
    if (IsIos) {
      return item.showType == 1 || item.showType == 2
    } else {
      return item.showType == 1 || item.showType == 3
    }
  })
  return bannerList
}

// 获取字符串长度
Foundation.getStrLength = (str) => {
  if (str == null) return 0;
  if (typeof str != "string") {
    str += "";
  }
  return str.replace(/[^\x00-\xff]/g, "01").length
}

// 解析链接参数
Foundation.getUrlQuery = url => {
  url = url.split('?')[1] //获取url中"?"符后的字串   
  if (!url) return {}
  let queryObj = {}
  let tmpArr = url.split("&")
  for (let i = 0; i < tmpArr.length; i++) {
    queryObj[tmpArr[i].split("=")[0]] = unescape(tmpArr[i].split("=")[1])
  }
  return queryObj
}

//banner通用跳转逻辑
Foundation.commonBannerAction = (item, navigation, isVip) => {
  if (item.vipShow && !isVip) {
    if (item.des) Toast.show(item.des)
  } else {
    if (item.targetPageUrl) {
      if (item.needLogin && !global.isLogin) {
        navigation.navigate('Login', {
          'loginCallBack': () => {
            navigation.navigate('WebView', { url: item.targetPageUrl, title: item.targetPageTitle })
          }
        })
      } else {
        navigation.navigate('WebView', { url: item.targetPageUrl, title: item.targetPageTitle })
      }
    } else if (item.targetPagePath) {
      let params = item.des && Foundation.isJson(item.des) ? JSON.parse(item.des) : {};
      if (item.needLogin && !global.isLogin) {
        navigation.navigate('Login', {
          'loginCallBack': () => {
            navigation.navigate(item.targetPagePath, { title: item.itemName ? item.itemName.split("|")[0] : '', ...params })
          }
        })
      } else {
        navigation.navigate(item.targetPagePath, { title: item.itemName ? item.itemName.split("|")[0] : '', ...params })
      }
    }
  }
}

/**
 * 处理UTCDateString，转换本地时区时间
 * @param UTCDateString
 * @param isNeedHour
 * @returns {*|string}
 */
Foundation.convertUTCTimeToLocalTime = (UTCDateString, isNeedHour = true, isVipDate, isHour) => {

  if (!UTCDateString) {
    return '-';
  }
  function formatFunc(str) { //格式化显示
    return str > 9 ? str : '0' + str
  }
  var date2 = new Date(UTCDateString); //这步是关键
  var year = date2.getFullYear();
  var mon = formatFunc(date2.getMonth() + 1);
  var day = formatFunc(date2.getDate());
  if (isNeedHour) {
    var hour = formatFunc(date2.getHours());
    var min = formatFunc(date2.getMinutes());
    var sec = formatFunc(date2.getSeconds())
    var dateStr = year + '.' + mon + '.' + day + ' ' + hour + ':' + min;
    return dateStr;
  } else if (isVipDate) {
    var hour = formatFunc(date2.getHours());
    var min = formatFunc(date2.getMinutes());
    var sec = formatFunc(date2.getSeconds())
    var dateStr = year + '-' + mon + '-' + day + ' ' + hour + ':' + min;
    return dateStr;
  } else if (isHour) {
    var hour = formatFunc(date2.getHours());
    var min = formatFunc(date2.getMinutes());
    var dateStr = hour + ':' + min;
    return dateStr;
  } else {
    var dateStr = year + '.' + mon + '.' + day;
    return dateStr;
  }
}


Foundation.getCountDownTime = (cdtime, type) => {
  if (cdtime <= 0) return '00';
  if (type == 0) {
    //小时
    let hour = parseInt(cdtime / 3600);
    if (hour < 10) {
      return '0' + hour
    } else {
      return hour
    }
  } else if (type == 1) {
    //分钟
    let minute = parseInt(cdtime % 3600 / 60);
    if (minute < 10) {
      return "0" + minute;
    } else {
      return minute;
    }
  } else if (type == 2) {
    let second = parseInt(cdtime % 3600 % 60);
    if (second < 10) {
      return "0" + second;
    } else {
      return second;
    }
  }
}


Foundation.timeFormat = (time, type) => {
  var data = new Date(time)
  var year = data.getFullYear()
  var month = data.getMonth() + 1
  var day = data.getDate()
  var hour = data.getHours()
  var minute = data.getMinutes()
  var second = data.getSeconds()
  //加0
  if (month < 10)
    month = '0' + month
  if (day < 10)
    day = '0' + day
  if (hour < 10)
    hour = '0' + hour
  if (minute < 10)
    minute = '0' + minute
  if (second < 10)
    second = '0' + second

  if (typeof type == 'undefined' || type == '') {
    return year + '-' + month + '-' + day
  } else if (type == 1) {
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second
  } else if (type == 2) {
    return month + '-' + day + ' ' + hour + ':' + minute
  } else if (type == 3) {
    return year + '.' + month + '.' + day
  } else if (type == 4) {
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute
  } else if (type == 5) {
    return year + '年' + month + "月"
  } else if (type == 6) {
    return year + '/' + month + '/' + day
  } else if (type == 7) {
    return year + '.' + month + '.' + day + ' ' + hour + ":" + minute
  } else if (type == 8) {
    return year + '.' + month + '.' + day
  } else {
    return type.replace('y', year).replace('m', month).replace('d', day).replace('h', hour).replace('i', minute).replace('s', second)
  }
}

/**
 * @author Rui.Zhang
 * @description 判断是否为银行卡号
 * @param {String} str_cardNo 待校验的数据
 * @returns {Boolean}, true:是银行卡号
 **/
Foundation.isBankCard = (str_cardNo) => {
  str_cardNo = str_cardNo || String(this);
  if ("" == str_cardNo.trim() || undefined == str_cardNo) {
    return false;
  }
  var lastNum = str_cardNo.substr(str_cardNo.length - 1, 1);//取出最后一位（与luhm进行比较）

  var first15Num = str_cardNo.substr(0, str_cardNo.length - 1);//前15或18位
  var newArr = new Array();
  for (var i = first15Num.length - 1; i > -1; i--) {    //前15或18位倒序存进数组
    newArr.push(first15Num.substr(i, 1));
  }
  var arrJiShu = new Array();  //奇数位*2的积 <9
  var arrJiShu2 = new Array(); //奇数位*2的积 >9

  var arrOuShu = new Array();  //偶数位数组
  for (var j = 0; j < newArr.length; j++) {
    if ((j + 1) % 2 == 1) {//奇数位
      if (parseInt(newArr[j]) * 2 < 9)
        arrJiShu.push(parseInt(newArr[j]) * 2);
      else
        arrJiShu2.push(parseInt(newArr[j]) * 2);
    }
    else //偶数位
      arrOuShu.push(newArr[j]);
  }

  var jishu_child1 = new Array();//奇数位*2 >9 的分割之后的数组个位数
  var jishu_child2 = new Array();//奇数位*2 >9 的分割之后的数组十位数
  for (var h = 0; h < arrJiShu2.length; h++) {
    jishu_child1.push(parseInt(arrJiShu2[h]) % 10);
    jishu_child2.push(parseInt(arrJiShu2[h]) / 10);
  }

  var sumJiShu = 0; //奇数位*2 < 9 的数组之和
  var sumOuShu = 0; //偶数位数组之和
  var sumJiShuChild1 = 0; //奇数位*2 >9 的分割之后的数组个位数之和
  var sumJiShuChild2 = 0; //奇数位*2 >9 的分割之后的数组十位数之和
  var sumTotal = 0;
  for (var m = 0; m < arrJiShu.length; m++) {
    sumJiShu = sumJiShu + parseInt(arrJiShu[m]);
  }

  for (var n = 0; n < arrOuShu.length; n++) {
    sumOuShu = sumOuShu + parseInt(arrOuShu[n]);
  }

  for (var p = 0; p < jishu_child1.length; p++) {
    sumJiShuChild1 = sumJiShuChild1 + parseInt(jishu_child1[p]);
    sumJiShuChild2 = sumJiShuChild2 + parseInt(jishu_child2[p]);
  }
  //计算总和
  sumTotal = parseInt(sumJiShu) + parseInt(sumOuShu) + parseInt(sumJiShuChild1) + parseInt(sumJiShuChild2);

  //计算Luhm值
  var k = parseInt(sumTotal) % 10 == 0 ? 10 : parseInt(sumTotal) % 10;
  var luhm = 10 - k;

  if (lastNum == luhm) {
    return true;
  }
  else {
    return false;
  }
};

/**
 * 清除登录信息
 */
Foundation.removeLoginInfo = () => {
  global.storage.remove({ key: 'newtoken' });
  global.authorization = ''
  global.isLogin = false
  global.userInfo = null
  global.mallToken = ''
  if (constObj.nim) {
    constObj.nim.logout({
      done(error) {
        if (error) {
          console.log(error);
        }
        AsyncStorage.removeItem('account');
        AsyncStorage.removeItem('password');
      },
    });
  }
  JPushModule.deleteAlias(map => {
    if (map.errorCode === 0) {
      console.log('delete alias succeed')
    } else {
      console.log('delete alias failed, errorCode: ' + map.errorCode)
    }
  })
}



//搜索历史取值写入页面
Foundation.showHistoryItems = (Fn) => {
  global.storage.load({ key: 'searchHistoryItems' }).then(hisItems => {
    if (hisItems != undefined && hisItems.trim().length != 0) {
      let historyArray = new Array()
      historyArray = hisItems.split("|")
      Fn && Fn(historyArray)
      // this.setState({
      //     historyItemsArray : historyArray
      // })
    }
  }).catch(err => console.log(err))
}
//搜索历史存值方法,新的值添加在首位
Foundation.setHistoryItems = (keyword, Fn) => {
  global.storage.load({ key: 'searchHistoryItems' }).then(historyItems => {
    let newHostory = historyItems.split('|').filter(e => e != keyword)
    if (newHostory.length > 0) {
      if (newHostory.length == 10) {
        newHostory.pop()
        historyItems = keyword + '|' + newHostory.join('|')
      } else {
        historyItems = keyword + '|' + historyItems.split('|').filter(e => e != keyword).join('|')
      }
    }
    global.storage.save({
      key: "searchHistoryItems",
      data: historyItems
    });
    Fn && Foundation.showHistoryItems(Fn)
  }).catch(err => {
  })
  JPushModule.deleteAlias(map => {
    if (map.errorCode === 0) {
      console.log('delete alias succeed')
    } else {
      console.log('delete alias failed, errorCode: ' + map.errorCode)
    }
  })
}

Foundation.isObject = (params) => {
  return typeof params == 'object';
}

//分to元
Foundation.Fen2Yuan = (num) => {
  if (typeof num !== "number" || isNaN(num)) return null;
  return parseInt(num / 100);
}
//厘to元
Foundation.Li2Yuan = (num) => {
  if (typeof num !== "number" || isNaN(num)) return null;
  return parseInt(num / 1000);
}

//分to元
Foundation.Fen2YuanFloat = (num) => {
  if (typeof num !== "number" || isNaN(num)) return null;
  return parseFloat(num / 100);
}
//分to万
Foundation.Fen2Wan = (num) => {
  if (typeof num !== "number" || isNaN(num)) return null;
  return parseFloat(num / 1000000);
}
Foundation.formatMoney = (num) => {
  if (typeof num !== "number" || isNaN(num)) return null;
  if (parseInt(num / 100) < 10000) {
    return Foundation.Fen2Yuan(num)
  } else {
    return Foundation.Fen2Wan(num);
  }
}
Foundation.MoneyUnit = (num) => {
  if (typeof num !== "number" || isNaN(num)) return '';
  let common_unit_wan = I18n.t('common_unit_wan');
  if (parseInt(num / 100) < 10000) {
    return '';
  } else {
    return common_unit_wan;
  }
}
Foundation.formatFenPrice = (num) => {
  let price = Foundation.Fen2Yuan(num);
  return String(Number(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

//元to分,取整数
Foundation.Yuan2Fen = (num) => {
  if (typeof num !== "number" || isNaN(num)) return null;
  return parseInt(num * 100);
}
//元to分,保留小数
Foundation.Yuan2FenFloat = (num) => {
  if (typeof num !== "number" || isNaN(num)) return null;
  return parseFloat(num * 100);
}

//厘转元保留小数
Foundation.Li2YuanDecimal = (num) => {
  var n = 2 //设置保留的小数位数
  if (typeof num !== "number" || isNaN(num)) return null;
  let s = num / 1000
  s = parseFloat((s + "").replace(/[^\d\.-]/g, "")).toFixed(n) + "";
  var l = s.split(".")[0].split("").reverse();
  var r = s.split(".")[1];
  var t = "";
  for (i = 0; i < l.length; i++) {
    t += l[i];
  }
  return t.split("").reverse().join("") + "." + r;
}
//厘转元,小于一元保留两位小数，大于一取整数
Foundation.Li2YuanFormat = (num) => {
  if (typeof num !== "number" || isNaN(num)) return null;
  if (num < 1000) {
    let s = parseFloat(num / 1000)
    s = Number(s.toString().match(/^\d+(?:\.\d{0,2})?/));
    return s;
  } else {
    return parseInt(num / 1000);
  }
}

//厘转元精确两位小数
Foundation.Li2YuanAccurate = (num) => {
  if (typeof num !== "number" || isNaN(num)) return null;
  let s = parseFloat(num / 1000)
  let isMinus = (s < 0 ? true : false);
  if (isMinus) s = Math.abs(s)
  s = Number(s.toString().match(/^\d+(?:\.\d{0,2})?/));
  return isMinus ? -s : s;
}

//分钟转XX时XX分
Foundation.MinutesToHour = (str) => {
  if (str !== "0" && str !== "" && str !== null) {
    return ((Math.floor(str / 60)).toString().length < 2 ? "0" + (Math.floor(str / 60)).toString() :
      (Math.floor(str / 60)).toString()) + global.I18nRd('时') + ((str % 60).toString().length < 2 ? "0" + (str % 60).toString() : (str % 60).toString()) + global.I18nRd('分');
  }
  else {
    return "";
  }
}

/* 微信分享 */
Foundation.doShare = (title, description, webpageUrl, thumbImage) => {
  ShareModal.show(title, description, webpageUrl, thumbImage)
}
Foundation.shareToSession = (title, description, webpageUrl, thumbImage) => {
  WeChat.isWXAppInstalled()
    .then((isInstalled) => {
      if (isInstalled) {
        WeChat.shareToSession({ type: 'news', description, webpageUrl, title, thumbImage })
          .then(data => {
            console.log(data, 'share')
            this.refs.sharemodel.close();
          }).catch(error => {
            console.log(error)
            this.refs.sharemodel.close();
          })
      } else {
        Toast.show('您还没有安装微信应用，请先安装微信')
      }
    })


}


Foundation.shareToTimeline = (title, description, webpageUrl, thumbImage) => {
  WeChat.isWXAppInstalled()
    .then((isInstalled) => {
      if (isInstalled) {
        WeChat.shareToTimeline({ type: 'news', description, webpageUrl, title, thumbImage })
          .then(data => {
            this.refs.sharemodel.close();
          }).catch(error => {
            this.refs.sharemodel.close();
          })
      } else {
        Toast.show('您还没有安装微信应用，请先安装微信')
      }
    })
}

Foundation.increment = (initialValue, incrementalValue, timeInterval, callBack) => {
  if (incrementalValue == 0) {
    incrementalValue = 1
  }
  let num = 0
  setInterval(() => {
    num = num + 1
    if (num > incrementalValue) {
      return
    }
    callBack && callBack(initialValue += 1)
  }, timeInterval / incrementalValue)

}

Foundation.incrementBigNum = (initialValue, incrementalValue, timeInterval, addNum, callBack) => {
  if (incrementalValue == 0) {
    incrementalValue = 1
  }
  let num = 0
  setInterval(() => {
    num = num + addNum
    if (num > incrementalValue) {
      return
    }
    callBack && callBack(initialValue += addNum)
  }, timeInterval / incrementalValue)

}

Foundation._shareToMiniProgram = (description, webpageUrl, title, thumbImage, isVideo) => {
  var shareImage = thumbImage
  global.storage.load({ key: 'waterMark' }).then(data => {
    if (isVideo) {
      shareImage = thumbImage.replace('_300x300', '') + data
    }
  }).catch(err => {
  })

  WeChat.isWXAppInstalled()
    .then((isInstalled) => {
      if (isInstalled) {
        let weixinMiniProgramShareInfo = {
          miniProgramType: ENV === 'test' ? 'develop' : 'release',
          type: 'weapp',
          title: title,
          thumbImage: shareImage,
          description: description,
          webpageUrl: webpageUrl,
          userName: Min_Program,
          path: webpageUrl,//小程序页面路径
        }
        WeChat.shareToSession(weixinMiniProgramShareInfo).then((res) => {

          Toast.show('分享成功')
        }).catch((err) => {
          Toast.show('分享失败')
        });

      } else {
        Toast.show('您还没有安装微信应用，请先安装微信')
      }
    })
}

Foundation.itemClick = (item, user, navigation, toLoanAction) => {
  if (!item.appUrl) return;
  let isVip = user && user.isVip
  let isLogin = global.isLogin;
  // 需要登录
  if (item.needLogin) {
    if (isLogin) {
      // 需要vip
      if (item.needVip) {
        if (isVip) {
          Foundation.siteBrowserHistoryPush(item.appUrl, navigation, toLoanAction)
        } else {
          navigation.navigate("Member")
        }
      } else {
        Foundation.siteBrowserHistoryPush(item.appUrl, navigation, toLoanAction)
      }
    } else {
      navigation.navigate('Login', { loginCallBack: () => this.itemClick(item) })
    }
  } else {
    Foundation.siteBrowserHistoryPush(item.appUrl, navigation, toLoanAction)
  }
}

Foundation.siteBrowserHistoryPush = (link, navigation, toLoanAction) => {
  if (/^post/.test(link)) {
    let type = link.replace('post://', '');
    if (type == 'creditLine') {
      toLoanAction()
    }
  } else if (/(^navigate)|(^push)/.test(link)) {
    let tmpNavigationArr = link.replace(/(\:\/\/)/, ',').replace(/(\?)/, ',').split(',')
    let api = tmpNavigationArr[0]
    let router = tmpNavigationArr[1]
    let params = {}
    if (tmpNavigationArr[2]) {
      let tmpParamsArr = tmpNavigationArr[2].split("|")
      tmpParamsArr.map(item => {
        let tempUrlArray0 = item.replace(/(\=)/, ',').split(',')[0]
        let tempUrlArray1 = item.replace(/(\=)/, ',').split(',')[1]
        params[tempUrlArray0] = tempUrlArray1
      })
    }
    if (api == 'navigate') {
      navigation.navigate(router, params || {})
    } else if (api == 'push') {
      navigation.push(router, params || {})
    } else if (api == 'goback') {
      navigation.goback()
    } else if (api == 'pop') {
      navigation.pop(params.step || 1)
    } else if (api == 'popToTop') {
      navigation.popToTop()
    } else if (api == 'replace') {
      navigation.replace(router, params || {})
    }
  } else {
    navigation.push('HomeWebView', { url: link.indexOf('http') != -1 ? link : MALL_HOST + link })
  }
}

//获取图片高度
Foundation.getImgHeight = (showWidth, uiWidth, uiHeight) => {
  if (showWidth && uiWidth && uiHeight) {
    return parseInt(showWidth / (Math.round(uiWidth / uiHeight * 100) / 100))
  }
}

/**
 * rooomName:房间名
 * open：是否公开
 * three:true为三人，false为七人
 * multiFirends true为七人交友，false为七人相亲 三人房不用传
 */
Foundation.createRoom = (roomName, open, three, multiFriends) => {
  Foundation.checkPermission()
    .then(data => {
      if (data) {
        RoomApi.createRoom(roomName, open, three, !three && multiFriends)
          .then(data => {
            this.liveUrl = !three ? "rtmp://pili-publish.ps.pdex-service.com/sdk-demo/habishu4-1?key=757217" : 'rtmp://pili-publish.ps.pdex-service.com/sdk-demo/habishu4-3?key=757217';//todo 改为返回的url
            NavigationService.navigate("LiveRoom", { action: 'create', agoraToken: data.agoraToken, liveUrl, roomId: data.id + "" });
            console.log(data, 'createRoomsucc')
          }).catch(err => {
            console.log(err, 'createRoomerror')
          })
      } else {
        Foundation.openSettingAlert();
      }
    })
}

/**
 * 观众进入直播间
 */
Foundation.joinRoom = (roomId, navigation) => {
  Foundation.checkPermission()
    .then(data => {
      if (data) {
        if(navigation && navigation.replace){ //一键上麦
          navigation.replace('LiveRoom', { action: 'guest', roomId: roomId + "", isOneApply: true })
        }else{
          NavigationService.navigate('LiveRoom', { action: 'guest', roomId: roomId + "" })
        }
      } else {
        Foundation.openSettingAlert()
      }
    })
}

Foundation.requestMicrophone = () => {
  return new Promise((resolve, rejects) => {
    Permissions.request('microphone')
      .then(response => {
        global.microphone = response
        console.log(response, 'microphonerequest')
        resolve(global.microphone == 'authorized' && global.camera == 'authorized');
      }).catch(err => {
        console.log(err, 'microphonerequesterr')
        resolve(global.microphone == 'authorized' && global.camera == 'authorized');
      })

  })
}

Foundation.requestStorage = () => {
  return new Promise((resolve, rejects) => {
    Permissions.request('storage')
      .then(response => {
        global.storagepermission = response
        console.log(response, 'storagerequest')
        resolve(global.storagepermission == 'authorized' && global.camera == 'authorized');
      }).catch(err => {
        console.log(err, 'storagerequesterr')
        resolve(global.storagepermission == 'authorized' && global.camera == 'authorized');
      })

  })
}

Foundation.checkAvatarPermission = (permission) => {
  return new Promise((resolve, rejects) => {
    Permissions.check(permission)
      .then(response => {
        console.log(response, 'checkPermission')
        if (response != 'authorized') {
          Permissions.request(permission)
            .then(respdata => {
              resolve(respdata == 'authorized');
            })
        } else {
          resolve(true)
        }
      }).catch(err => {
        resolve(false);
        console.log(err)
      })
  })
}

Foundation.checkAvatarPermissions = () => {
  return new Promise((resolve, rejects) => {
    Permissions.checkMultiple(['camera', 'storage'])
      .then(data => {
        console.log(data, 'multiplePermissions')
        global.camera = data.camera,
          global.storagepermission = data.storage
        if (data.camera != 'authorized') {
          Permissions.request('camera')
            .then(response => {
              console.log(response, 'camerarequest')
              global.camera = response
              if (global.storagepermission != 'authorized') {
                Foundation.requestStorage()
                  .then(data => {
                    resolve(data)
                  })
              } else {
                resolve(global.camera == 'authorized')
              }
            }).catch(err => {
              console.log(err, 'camerarequesterr')
              if (global.storagepermission != 'authorized') {
                Foundation.requestStorage()
                  .then(data => {
                    resolve(data)
                  })
              }
            })

        } else if (data.storagepermission != 'authorized') {
          Foundation.requestStorage()
            .then(data => {
              resolve(data)
            })
        } else {
          return resolve(true);
        }
      }).catch(err => {
        resolve(global.storagepermission == 'authorized' && global.camera == 'authorized');
        console.log(err)
      })
  })
}

Foundation.checkPermission = () => {
  return new Promise((resolve, rejects) => {
    Permissions.checkMultiple(['camera', 'microphone'])
      .then(data => {
        console.log(data, 'multiplePermissions')
        global.camera = data.camera,
          global.microphone = data.microphone
        if (data.camera != 'authorized') {
          Permissions.request('camera')
            .then(response => {
              console.log(response, 'camerarequest')
              global.camera = response
              if (global.microphone != 'authorized') {
                Foundation.requestMicrophone()
                  .then(data => {
                    resolve(data)
                  })
              } else {
                resolve(global.camera == 'authorized')
              }
            }).catch(err => {
              console.log(err, 'camerarequesterr')
              if (global.microphone != 'authorized') {
                Foundation.requestMicrophone()
                  .then(data => {
                    resolve(data)
                  })
              }
            })

        } else if (data.microphone != 'authorized') {
          Foundation.requestMicrophone()
            .then(data => {
              resolve(data)
            })
        } else {
          return resolve(true);
        }
      }).catch(err => {
        resolve(global.microphone == 'authorized' && global.camera == 'authorized');
        console.log(err)
      })
  })
}

Foundation.openSettingAlert = () => {
  Alert.alert(
    '',
    IsIos ? `请在iPhone的“设置-隐私”选项中，允许${APP_CH_NAME}访问您的相机和麦克风` : `${APP_CH_NAME}需要您的相机和麦克风权限`,
    [
      {
        text: '取消',
        onPress: () => console.log('Permission denied'),
      },

      { text: '打开设置', onPress: IsIos ? Permissions.openSettings : AndroidOpenSettings.appDetailsSettings },
    ],
  )
}

Foundation.openAvatarSettingAlert = () => {
  Alert.alert(
    '',
    IsIos ? `请在iPhone的“设置-隐私”选项中，允许${APP_CH_NAME}访问您的相机` : `${APP_CH_NAME}需要您的相机和存储权限`,
    [
      {
        text: '取消',
        onPress: () => console.log('Permission denied'),
      },

      { text: '打开设置', onPress: IsIos ? Permissions.openSettings : AndroidOpenSettings.appDetailsSettings },
    ],
  )
}

Foundation.serviceAction = (isMaker, title) => {
  if (global.commonVarsInfo) {
    let service = isMaker ? global.commonVarsInfo.HONGNIANGKEFU : global.commonVarsInfo.PUTONGKEFU;
    HomeInfo.concatUserToService().then(data => {
      if (data) {
        let url = service + '&cinfo=' + data.cinfo + '&key=' + data.key;
        NavigationService.navigateKey("WebView", { url, title: title || global.I18nt('投诉与反馈') }, 'service');
      }
    }).catch(err => {
      NavigationService.navigateKey("WebView", { url: service, title: title || global.I18nt('投诉与反馈') }, 'service');
    })
  }
}

Foundation.commonCache = (item, namespace, key) => {
  if (!item.expires) {
    return Foundation.getDataThenCache(item, namespace, key);
  } else {
    return global.storage.load({ key: namespace, id: key }).then(res => {
      global.cache[namespace] = global.cache[namespace] || {};
      global.cache[namespace][key] = res;
      return res;
    }).catch(err => {
      return Foundation.getDataThenCache(item, namespace, key)
    })
  }
}

Foundation.saveCache = (item, namespace, key, data) => {
  global.cache[namespace] = global.cache[namespace] || {};
  global.cache[namespace][key] = data;
  if (item.expires) global.storage.save({ key: namespace, id: key, data, expires: item.expires });
}

Foundation.getDataThenCache = (item, namespace, key) => {
  let { url, method, params } = item;
  if (method == 'get') {
    return new Promise((resolve, reject) => {
      Fetch.get(params?{ url, params }:{ url })
        .then(data => { Foundation.saveCache(item, namespace, key, data); resolve(data); })
        .catch(errorCode => reject(errorCode));
    });
  } else if (method == 'post') {
    return new Promise((resolve, reject) => {
      Fetch.post({ url })
        .then(data => { Foundation.saveCache(item, namespace, key, data); resolve(data); })
        .catch(errorCode => reject(errorCode));
    });
  } else {
    return new Promise((resolve, reject) => {
      Fetch.getVarsByNameSpace({ url })
        .then(data => { Foundation.saveCache(item, namespace, key, data); resolve(data); })
        .catch(errorCode => reject(errorCode));
    });
  }
}

Foundation.preloadApi = (namespace) => {
  //获取namespace数据
  let cacheSpace = CacheConfig[namespace] || {};
  let cacheKeys = Object.keys(cacheSpace);
  let promiseList = [];
  cacheKeys.forEach((key) => {
    if (cacheSpace[key] && cacheSpace[key].url) promiseList.push(Foundation.commonCache(cacheSpace[key], namespace, key));
  });
  return Promise.all(promiseList).then(array => {
    return array;
  })
}

Foundation.preloadImg = (namespace) => {
  //获取namespace数据
  let cacheSpace = CacheConfig[namespace] || {};
  if (cacheSpace.prefetch) {
    CacheApi.getCacheImage(namespace).then(data => {
      data && data.forEach((url) => { Image.prefetch(url) });
    })
  }
}

Foundation.commonPreLoad = (namespace) => {
  //获取namespace数据
  Foundation.preloadApi(namespace);
  Foundation.preloadImg(namespace);
}

Foundation.getCompressImg = (url, width = 96, height = 96) => {
  return `${url}?x-oss-process=image/resize,m_fill,h_${height * 3},w_${width * 3}`
}

Foundation.getCompressImgNoMuti = (url, width = 96, height = 96) => {
  return `${url}?x-oss-process=image/resize,m_fill,h_${height},w_${width}`
}

Foundation.isObject = (params) => {
  return typeof params == 'object';
}

export default Foundation;