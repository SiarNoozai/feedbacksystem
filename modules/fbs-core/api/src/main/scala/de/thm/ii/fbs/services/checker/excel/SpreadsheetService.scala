package de.thm.ii.fbs.services.checker.excel

import org.apache.poi.ss.usermodel.CellType
import org.apache.poi.xssf.usermodel.{XSSFFormulaEvaluator, XSSFSheet, XSSFWorkbook}
import org.springframework.stereotype.Service

import java.io.{File, FileInputStream}
import java.text.NumberFormat
import java.util.Locale
import scala.util.matching.Regex

/**
  * A Spreadsheet Service
  */
@Service
class SpreadsheetService {
  private case class Cords(row: Int, col: Int)

  /**
    * Gets the values in the selected field range
    * @param spreadsheet the spreadsheet field
    * @param userIDField the field id of the field in which the userID should be inserted
    * @param userID      the userID to insert
    * @param fields      the field for which to get the values
    * @return the values
    */
  def getFields(spreadsheet: File, userIDField: String, userID: String, fields: String): Seq[(String, String)] = {
    val sheet = this.initSheet(spreadsheet, userIDField, userID)
    val (start, end) = this.parseCellRange(fields)
    val labels = this.getInCol(sheet, start.col, start.row, end.row)
    val values = this.getInCol(sheet, end.col, start.row, end.row)
    labels.zip(values)
  }

  private def initSheet(spreadsheet: File, userIDField: String, userID: String): XSSFSheet = {
    val input = new FileInputStream(spreadsheet)
    val workbook = new XSSFWorkbook(input)
    val sheet = workbook.getSheetAt(0)
    this.setCell(sheet, this.parseCellAddress(userIDField), userID)
    XSSFFormulaEvaluator.evaluateAllFormulaCells(workbook)
    sheet
  }

  private def getInCol(sheet: XSSFSheet, col: Int, start: Int, end: Int): Seq[String] =
    (start to end).map(i => {
      val cell = sheet.getRow(i).getCell(col)
      val res = if (cell == null) {
        ""
      } else {
        cell.getCellType match {
          case CellType.FORMULA => try {
            germanFormat.format(cell.getNumericCellValue)
          } catch {
            case e: IllegalStateException => try {
              cell.getStringCellValue
            } catch {
              case e: IllegalStateException =>
                throw new Exception(i, col, cell.getErrorCellString)
            }
          }
          case CellType.NUMERIC => germanFormat.format(cell.getNumericCellValue)
          case CellType.STRING => cell.getStringCellValue
          case _ => ""
        }
      }
      res
    })

  private def setCell(sheet: XSSFSheet, cords: Cords, value: String): Unit = {
    sheet.getRow(cords.row).getCell(cords.col).setCellValue(value)
  }

  private def parseCellRange(range: String): (Cords, Cords) = {
    val split = range.split(':')
    if (split.length != 2) {
      throw new IllegalArgumentException("expected range to have 2 components got " + split.length)
    }
    (this.parseCellAddress(split(0)), this.parseCellAddress(split(1)))
  }

  private val regexp = new Regex("(\\d+)([A-Z]+)")

  private def parseCellAddress(address: String): Cords = {
    val m = regexp.findFirstMatchIn(address) match {
      case Some(m) => m
      case _ => throw new IllegalArgumentException(address + " is not a valid cell address")
    }
    Cords(Integer.parseInt(m.group(1))-1, this.colToInt(m.group(2).charAt(0))-1)
  }

  private def colToInt(col: Char): Int =
    col.toInt - 64

  private val germanFormat = NumberFormat.getNumberInstance(Locale.GERMAN)

  /**
    * @param row the row where the errror occured
    * @param col the col where the error occured
    * @param message the error returned by the spreadsheet
    */
  class Exception(row: Int, col: Int, message: String) extends RuntimeException("SpreadsheetException@" + row.toString + "," + col.toString + ": " + message)
}
