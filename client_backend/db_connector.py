from dotenv import load_dotenv

load_dotenv()
import os
import MySQLdb


class Database:
    def __init__(self, host, user, password, database):
        self.host = host
        self.user = user
        self.password = password
        self.database = database
        self.connection = None
        self.cursor = None

    def connect(self):
        try:
            self.connection = MySQLdb.connect(host=self.host, user=self.user, passwd=self.password, db=self.database)
            self.cursor = self.connection.cursor()
            return "success"
        except MySQLdb.Error as e:
            return f"Error connecting to database: {e}"

    def disconnect(self):
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
            return "success"

    def execute_query(self, query):
        try:
            self.cursor.execute(query)
            self.connection.commit()
            return "success"
        except MySQLdb.Error as e:
            return f"Error executing query: {e}"


class TbMessage(Database):
    def create_table(self):

        Database.execute_query(self, """CREATE TABLE message_table (
                                            id INT PRIMARY KEY AUTO_INCREMENT,
                                            message TEXT,
                                            is_active TINYINT DEFAULT 0);""")

        return True

    def insert_data(self, message, is_active):
        if int(is_active) == 1:
            deactivate_query = "UPDATE message_table SET is_active = 0"
            Database.execute_query(self, deactivate_query)
        if int(is_active) != 1 or int(is_active) != 0:
            return "Active should be 1 or 0"

        result = Database.execute_query(self,
                                        f"INSERT into message_table (message, is_active) VALUES('{message}',{is_active});")

        return result

    def fetch_result(self, id=None, message=None, is_active=None):
        data = []
        if id:
            Database.execute_query(self, f"SELECT * from message_table where id = {id} AND is_active = 1")
        else:
            Database.execute_query(self, "SELECT * from message_table where is_active = 1")

        results = self.cursor.fetchall()
        if results:
            data = [dict(id=row[0], message=row[1], is_active=row[2]) for row in results]
        return data


