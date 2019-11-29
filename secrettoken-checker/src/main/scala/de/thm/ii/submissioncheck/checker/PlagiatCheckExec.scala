package de.thm.ii.submissioncheck.checker
import java.nio.file.{Path, Paths}

import de.thm.ii.submissioncheck.JsonHelper
import de.thm.ii.submissioncheck.SecretTokenChecker.{LABEL_ACCEPT, LABEL_TASKID, ULDIR, logger, sendMessage}
import de.thm.ii.submissioncheck.security.Secrets
import de.thm.ii.submissioncheck.services.FileOperations
import org.apache.kafka.clients.producer.ProducerRecord

import scala.collection.mutable.ListBuffer
import scala.sys.process.{Process, ProcessLogger}

/**
  * Hello World Checker Class is an example
  *
  * @param compile_production flagg which compiles the path corresponding if app runs in docker or not
  */
class PlagiatCheckExec(override val compile_production: Boolean) extends BaseChecker(compile_production) {
  /** the unique identification of a checker, will extended to "plagiarismchecker" */
  override val checkername = "plagiarism"
  /** define which configuration files the checker need - to be overwritten */
  override val configFiles: List[String] = List("")

  private def submissionIdsOfUser(jsonMap: Map[String, Any], userid: Int) = {
    val token = jsonMap("jwt_token").asInstanceOf[String]
    val taskid = jsonMap("taskid").toString.toInt
    val (code, msg, map) = apiCall(s"""${jsonMap("api_url")}/tasks/${taskid}/submissions/${userid}""", token, "GET")
    map.asInstanceOf[List[Map[String, Any]]].map(v => v("submission_id").toString)
  }

  private def createFoldersForEachUser(jsonMap: Map[String, Any]) = {
    val token = jsonMap("jwt_token").asInstanceOf[String]
    val (code, msg, map) = apiCall(s"${jsonMap("api_url")}/courses/${jsonMap("courseid")}/submissions", token, "GET")
    val taskid = jsonMap("taskid").toString.toInt
    val subUser = jsonMap("userid").toString.toInt // some

    val basepath: Path = Paths.get(ULDIR).resolve(taskid.toString).resolve("PLAGIAT_CHECK").resolve(Secrets.getSHAStringFromNow())
    basepath.toFile.mkdirs()

    val availableSubmissionFolders = Paths.get(ULDIR).resolve(taskid.toString).toFile.listFiles
      .filter(f => f.isDirectory)
      .filter(f => (f.getName forall Character.isDigit))
      .toList

    var pathesOfUsers = new ListBuffer[(Path, String)]()
    if (code < 400) {
      for (userMap <- map.asInstanceOf[List[Map[String, Any]]]) {
        val user = userMap("user_id").toString.toInt
        if (subUser != user) {
          val subIds = submissionIdsOfUser(jsonMap, user)
          availableSubmissionFolders.filter(f => subIds.contains(f.getName)).foreach(dir => {
            val path = basepath.resolve(user.toString).resolve(dir.getName)
            pathesOfUsers += ((path, dir.getName))
            FileOperations.copy(dir, path.toFile)
          })
        }
      }
    }
    (pathesOfUsers.toList, basepath)
  }

  /**
    * perform a check of request, will be executed after processing the kafka message
    *
    * @param taskid            submissions task id
    * @param submissionid      submitted submission id
    * @param submittedFilePath path of submitted file (if zip or something, it is also a "file"
    * @param isInfo            execute info procedure for given task
    * @param use_extern        include an existing file, from previous checks
    * @param jsonMap           complete submission payload
    * @return check succeeded, output string, exitcode
    */
  override def exec(taskid: String, submissionid: String, submittedFilePath: String, isInfo: Boolean, use_extern: Boolean, jsonMap: Map[String, Any]):
  (Boolean, String, Int) = {
    // A submission a user does
    var plagiatExecPath = Paths.get(ULDIR).resolve(taskid).resolve(submissionid).toAbsolutePath.toString
    var output = s"The ${checkername} checker results: ${true}"
    var exitcode = -1

    try {
      val (pathsToCompare, basepath) = createFoldersForEachUser(jsonMap)
      val dockerRelPath = System.getenv("HOST_UPLOAD_DIR")

      var seq: Seq[String] = null
      val stdoutStream = new StringBuilder;
      val stderrStream = new StringBuilder
      val prozessLogger = ProcessLogger((o: String) => stdoutStream.append(o), (e: String) => stderrStream.append(e))
      val bashDockerImage = System.getenv("BASH_DOCKER")
      var summerizedPassed = true

      for (subInfo <- pathsToCompare) {
        val otherSubmissionsNotFromUser = subInfo._1

          var oldPath = otherSubmissionsNotFromUser.toAbsolutePath.toString
          if (compile_production) {
            oldPath = dockerRelPath + __slash + oldPath.replace(ULDIR, "")
            plagiatExecPath = dockerRelPath + __slash + plagiatExecPath.replace(ULDIR, "")
          }
          // That's how we use sim (https://manpages.ubuntu.com/manpages/trusty/man1/similarity-tester.1.html)
          seq = Seq("run", "--rm", __option_v, s"$plagiatExecPath:/upload-dir/plagiat/new", __option_v, s"${oldPath}:/upload-dir/plagiat/old", bashDockerImage,
            "bash", "/opt/sim/run_check.sh")

          exitcode = Process("docker", seq).!(prozessLogger)
          val process = processSIMOutput(stdoutStream.toString() + "\n" + stderrStream.toString())
          summerizedPassed = (summerizedPassed && process._1)
          logger.warning(process._2.reduce((a, b) => s"${a}, ${b}"))
          // always needs to send also the paires submission, ONLY on failures!
          if (!process._1) sendPlagiatAnswer(subInfo._2, process._1, taskid)
      }
      sendPlagiatAnswer(submissionid, summerizedPassed, taskid)

      FileOperations.rmdir(basepath.toFile)
    } catch {
      case e: Exception => output = e.toString
    }

    // Always return TRUE, not to inform the user about this plagirism, but to give feedback, all checks are done
    // feedback is saved in another way
    (true, output, exitcode)
  }

  private def sendPlagiatAnswer(subid: Any, plagiatOK: Boolean, taskid: Any) = {
    val topic = "plagiarismchecker_answer"
    val msg = JsonHelper.mapToJsonStr(Map("success" -> true, LABEL_TASKID -> taskid.toString, "submissionlist" -> List(Map(
      subid.toString -> plagiatOK
    )), LABEL_ACCEPT -> false))
    logger.warning(msg)
    sendMessage(new ProducerRecord[String, String](topic, msg))
  }

  private def processSIMOutput(output: String): (Boolean, List[String]) = {
    val pattern = "(consists for (\\d+) % of)".r
    logger.warning(output)
    val found = pattern.findFirstIn(output)
    if (found.isEmpty) {
      (true, List("nothing"))
    } else {
      (false, pattern.findAllMatchIn(output).map(m => m.group(2).toString).toList)
    }
  }
}
