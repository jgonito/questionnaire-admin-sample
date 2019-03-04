-- MySQL Administrator dump 1.4
--
-- ------------------------------------------------------
-- Server version	5.5.16


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;


--
-- Create schema questionnaire
--

CREATE DATABASE IF NOT EXISTS questionnaire;
USE questionnaire;

--
-- Definition of table `q_category`
--

DROP TABLE IF EXISTS `q_category`;
CREATE TABLE `q_category` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(3) unsigned NOT NULL DEFAULT '1',
  `created_by` int(10) unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `q_category`
--

/*!40000 ALTER TABLE `q_category` DISABLE KEYS */;
/*!40000 ALTER TABLE `q_category` ENABLE KEYS */;


--
-- Definition of table `q_choices`
--

DROP TABLE IF EXISTS `q_choices`;
CREATE TABLE `q_choices` (
  `question_id` int(11) NOT NULL,
  `letter` varchar(1) NOT NULL,
  `details` tinytext NOT NULL,
  `correct` tinyint(3) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`question_id`,`letter`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `q_choices`
--

/*!40000 ALTER TABLE `q_choices` DISABLE KEYS */;
/*!40000 ALTER TABLE `q_choices` ENABLE KEYS */;


--
-- Definition of table `q_question`
--

DROP TABLE IF EXISTS `q_question`;
CREATE TABLE `q_question` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `question` tinytext NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  `sub_category_id` int(10) unsigned DEFAULT '0',
  `choices_count` tinyint(3) unsigned NOT NULL,
  `is_active` tinyint(3) unsigned NOT NULL DEFAULT '1',
  `created_by` int(10) unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `q_question`
--

/*!40000 ALTER TABLE `q_question` DISABLE KEYS */;
/*!40000 ALTER TABLE `q_question` ENABLE KEYS */;


--
-- Definition of table `q_questionnaire`
--

DROP TABLE IF EXISTS `q_questionnaire`;
CREATE TABLE `q_questionnaire` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(250) NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  `sub_category_id` int(10) unsigned DEFAULT NULL,
  `allow_back` tinyint(3) unsigned DEFAULT '0',
  `allow_skip` tinyint(3) unsigned DEFAULT '0',
  `no_of_questions` int(10) unsigned NOT NULL,
  `passing_score` int(10) unsigned NOT NULL,
  `time_limit` int(10) unsigned NOT NULL DEFAULT '0' COMMENT 'in seconds',
  `random` tinyint(3) unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(3) unsigned NOT NULL DEFAULT '1',
  `created_by` int(10) unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `q_questionnaire`
--

/*!40000 ALTER TABLE `q_questionnaire` DISABLE KEYS */;
/*!40000 ALTER TABLE `q_questionnaire` ENABLE KEYS */;


--
-- Definition of table `q_questionnaire_questions`
--

DROP TABLE IF EXISTS `q_questionnaire_questions`;
CREATE TABLE `q_questionnaire_questions` (
  `questionnaire_id` int(10) unsigned NOT NULL,
  `question_id` int(10) unsigned NOT NULL,
  `seq` int(10) unsigned NOT NULL,
  PRIMARY KEY (`questionnaire_id`,`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `q_questionnaire_questions`
--

/*!40000 ALTER TABLE `q_questionnaire_questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `q_questionnaire_questions` ENABLE KEYS */;


--
-- Definition of table `q_session`
--

DROP TABLE IF EXISTS `q_session`;
CREATE TABLE `q_session` (
  `user_id` int(10) unsigned NOT NULL,
  `key` varchar(50) NOT NULL,
  `datetime` datetime NOT NULL,
  PRIMARY KEY (`user_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `q_session`
--

/*!40000 ALTER TABLE `q_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `q_session` ENABLE KEYS */;


--
-- Definition of table `q_sub_category`
--

DROP TABLE IF EXISTS `q_sub_category`;
CREATE TABLE `q_sub_category` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(3) unsigned NOT NULL DEFAULT '1',
  `category_id` int(10) unsigned NOT NULL,
  `created_by` int(10) unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `q_sub_category`
--

/*!40000 ALTER TABLE `q_sub_category` DISABLE KEYS */;
/*!40000 ALTER TABLE `q_sub_category` ENABLE KEYS */;


--
-- Definition of table `q_user`
--

DROP TABLE IF EXISTS `q_user`;
CREATE TABLE `q_user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `last_name` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(50) NOT NULL,
  `is_admin` tinyint(3) unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(3) unsigned NOT NULL DEFAULT '1',
  `created_by` int(10) unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `q_user`
--

/*!40000 ALTER TABLE `q_user` DISABLE KEYS */;
INSERT INTO `q_user` (`id`,`last_name`,`first_name`,`middle_name`,`email`,`username`,`password`,`is_admin`,`is_active`,`created_by`,`created_at`) VALUES 
 (1,'dela cruz','juan',NULL,NULL,'admin','21232f297a57a5a743894a0e4a801fc3',1,1,1,'2019-03-04 21:51:18');
/*!40000 ALTER TABLE `q_user` ENABLE KEYS */;




/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
