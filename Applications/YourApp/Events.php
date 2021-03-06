<?php
/**
 * This file is part of workerman.
 *
 * Licensed under The MIT License
 * For full copyright and license information, please see the MIT-LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @author walkor<walkor@workerman.net>
 * @copyright walkor<walkor@workerman.net>
 * @link http://www.workerman.net/
 * @license http://www.opensource.org/licenses/mit-license.php MIT License
 */

/**
 * 用于检测业务代码死循环或者长时间阻塞等问题
 * 如果发现业务卡死，可以将下面declare打开（去掉//注释），并执行php start.php reload
 * 然后观察一段时间workerman.log看是否有process_timeout异常
 */
//declare(ticks=1);

use \GatewayWorker\Lib\Gateway;

/**
 * 主逻辑
 * 主要是处理 onConnect onMessage onClose 三个方法
 * onConnect 和 onClose 如果不需要可以不用实现并删除
 */
class Events
{
    private static $clientArr = array();
    private static $logs = array();     //聊天记录
    /**
     * 当客户端连接时触发
     * 如果业务不需此回调可以删除onConnect
     * 
     * @param int $client_id 连接id
     */
    public static function onConnect($client_id)
    {
        $initData = array();
        $initData['title'] = '欢迎使用聊天系统';
    }

    /**
     * 当客户端发来消息时触发
     * @param int $client_id 连接id
     * @param mixed $message 具体消息
     * @throws Exception
     */
   public static function onMessage($client_id, $message)
   {
       $message = json_decode($message, true);
       $type = $message['type'];
       switch ($type) {
           /* 心跳检测 */
           case 'pong':
               return;
           /* 初始化数据 */
           case 'init':
               $ret = array();
               $ret['client'] = $client_id;
               $ret['all'] = self::$clientArr;
               Gateway::sendToClient($client_id, self::retData($type, $ret));
               return;
           /* 发送聊天信息 */
           case 'chat':
               $content = array();
               $content['from'] = Gateway::getUidByClientId($client_id);
               $content['to'] = $message['to'];
               $content['content'] = $message['content'];
               $content['time'] = time();

               self::$logs[] = $content;    //存入聊天记录
               Gateway::sendToUid($message['to'], self::retData($type, $content));
               return;
           /* 登陆 */
           case 'login':
               $uid = $message['content'];
               Gateway::bindUid($client_id, $uid);
               Gateway::joinGroup($client_id, 'online');
               $online = Gateway::getAllUidList();
               foreach ($online as $key =>$val){
                   if ($val !== $uid){
                       $initData['online'][] = array('id' => $val);
                   }
               }
               $initData['m'] = $uid;
               Gateway::sendToClient($client_id, self::retData('login', $initData));
               // 通知其他在线用户，我已上线
               Gateway::sendToGroup('online',self::retData('newMember', array('id' => $uid)), array($client_id));
               return;
           /* 聊天记录 */
           case 'logs':
               $logs = array();
               foreach (self::$logs as $key => $item) {
                    if ( ($item['from'] === Gateway::getUidByClientId($client_id) && $item['to'] === $message['content']) ||
                        ($item['to'] === Gateway::getUidByClientId($client_id) && $item['from'] === $message['content']) ) {
                        $logs[] = $item;
                    }
               }
               Gateway::sendToClient($client_id, self::retData('logs', $logs));
               return;
       }
   }
   
   /**
    * 当用户断开连接时触发
    * @param int $client_id 连接id
    */
   public static function onClose($client_id)
   {
       // 向所有人发送 
//       GateWay::sendToAll("$client_id logout\r\n");
       $data = array();
       $data['id'] = $client_id;
       Gateway::sendToClient($client_id, self::retData('logout', $data));
       unset(self::$clientArr[$client_id]);
   }

   public static function retData($type, $content)
   {
       $data = array(
           'type' => $type,
           'content' => $content
       );
       return json_encode($data);
   }
}
