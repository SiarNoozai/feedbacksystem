package de.thm.ii.fbs.nmodel

import java.security.Principal

/**
  * User object
  * @param id local DB's userid
  * @param prename User's prename
  * @param surname User's surname
  * @param email User's email
  * @param username User's username
  * @param globalRole User's role id
  * @param alias the DB password hash
  */
class User(val prename: String, val surname: String, val email: String,
          val username: String, val globalRole: GlobalRole.Value,
           val alias: Option[String] = None, val id: Int = 0) extends Principal {
  /**
    * @return unique username
    */
  override def getName: String = username

  /**
    * Compares objects instances: two users are equal if they have the same username
    * @param other Other user
    * @return true, if they have the same username.
    */
  override def equals(other: Any): Boolean = other match {
    case that: User => username.equals(that.username)
    case _ => false
  }

  /**
    * @return Hashcode of a user object
    */
  override def hashCode(): Int = {
    val state = Seq(username)
    state.map(_.hashCode()).foldLeft(0)((a, b) => 31 * a + b)
  }
}
