
var mysql = require('mysql');
const auth = require('./auth');

let __DATA__SCHEMA__ = 'techlympic';

let API = {
    sekolah: {
        first10: (fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query("SELECT * FROM sekolah limit 10", function (err, result) {
                    if (err) {
                        console.log('but with some error: ',err);
                    } else {
                        console.log('... with some data: ',result);
                        con.end();
                        
                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
        search: (q, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query("SELECT * FROM sekolah WHERE upper(namasekolah) regexp  upper(?) limit 15", [q], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();

                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
    },
    user: {
        isExist: (email, fn) => {
            try {
                var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
                con.query("SELECT * FROM user WHERE usr_email = ?", [email], (err, result) => {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();
                        var default_val = {
                            usr_role: '--Pilih Jenis Pengguna--',
                            kodsekolah: '', 
                            namasekolah: '', 
                            alamat1: '', 
                            alamat2: '', 
                            poskod: '', 
                            bandar: '', 
                            negeri: '--Pilih Negeri--'
                        }
                        var val = {
                            registered: result.length>0 ? true : false,
                            data: result.length>0 ? result[0] : default_val
                        }
                        
                        fn(val);
                    }
                });
            } catch (e) {
                console.log('------ERROR------>', e);
            }
        },
        register: (data, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query(
                    `INSERT INTO user (usr_name, usr_email, usr_role, usr_agent, kodsekolah, namasekolah, alamat1, alamat2, poskod, bandar, negeri)
                    values(?,?,?,?,?,?,?,?,?,?,?)
                    ON DUPLICATE KEY UPDATE
                        alamat1 = ?,
                        alamat2 = ?,
                        poskod = ?,
                        bandar = ?,
                        negeri = ?;
                    `, 
                [
                    data.usr_name, 
                    data.usr_email, 
                    data.usr_role, 
                    data.usr_agent, 
                    data.kodsekolah, 
                    data.namasekolah, 
                    data.alamat1, 
                    data.alamat2, 
                    data.poskod, 
                    data.bandar, 
                    data.negeri, 
                    data.alamat1, 
                    data.alamat2, 
                    data.poskod, 
                    data.bandar, 
                    data.negeri
                ], (err, result) => {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();

                        fn({message: 'Pendaftaran pengguna berjaya', registered:true});
                    }
                });
            } catch (e) {
                console.log(e);
            }
        }
    },
    peserta: {
        addBulk: (usr, data, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            const fields = ['usr_email','kp', 'nama', 'email', 'darjah_tingkatan', 'program'];
            let sql = `INSERT IGNORE INTO peserta (${fields.join(', ')}) VALUES ?`;
            try {
                con.query(sql, [data], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();
                        //con.release();

                        fn({msg: `Inserted ${result.affectedRows} rows`});
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },

        insertOrUpdate: (pesertaList, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            con.beginTransaction((err) => {
                if (err) throw err;
                
                
                // Loop through pesertaList and build INSERT or UPDATE query
                pesertaList.forEach((peserta) => {
                  const query = `
                    INSERT INTO peserta
                    SET ?
                    ON DUPLICATE KEY UPDATE
                    nama = VALUES(nama),
                    email = VALUES(email),
                    darjah_tingkatan = VALUES(darjah_tingkatan),
                    program = VALUES(program)
                  `;
            
                  // Execute query
                  con.query(query, peserta, (err, result) => {
                    if (err) {
                        con.rollback(() => {
                        throw err;
                      });
                    }
                  });
                });
            
                // Commit transaction
                con.commit((err) => {
                  if (err) {
                    con.rollback(() => {
                      throw err;
                    });
                  }
                  fn(`${pesertaList.length} peserta inserted or updated successfully`);
                });
            
                // Close connection
                con.end();
                //fn(`${pesertaList.length} peserta inserted or updated successfully`);
              });
        },

        countPenyertaan: (usr_email, fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                sqlstr = `
                    SELECT 'Jumlah Peserta' prog_name, COUNT(*) peserta 
                    FROM peserta where usr_email = ?

                    UNION 

                    SELECT 'Peserta telah didaftarkan program' prog_name, COUNT(*) peserta 
                    FROM peserta WHERE program <> '' and usr_email = ?

                    UNION 

                    SELECT 'Peserta belum didaftarkan program' prog_name, COUNT(*) peserta 
                    FROM peserta WHERE program = '' and usr_email = ?

                    UNION 

                    SELECT aa.prog_name, ifnull(bb.peserta,0) peserta
                    FROM program aa
                    LEFT JOIN 
                    (SELECT p prog_name, COUNT(*) peserta
                    FROM(
                    SELECT 
                        kp,if(a.program REGEXP b.prog_name, b.prog_name,'') p
                    FROM peserta a, program b
                    where a.usr_email = ?
                    ) m 
                    WHERE m.p <> ''
                    GROUP BY m.p) bb USING(prog_name)
                `
                con.query(sqlstr, [usr_email,usr_email,usr_email,usr_email], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();

                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
        loadPeserta: (email, peringkat, fn) => {
            var _peringkat = (peringkat === 'sekolah'? '' : ('_' + peringkat));
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query(`select * from peserta${_peringkat} where usr_email = ?`, [email], function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();
                        //console.log(result);
                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        },
    },
    program: {
        list: (fn) => {
            var con = mysql.createConnection(auth.auth()[__DATA__SCHEMA__]);
            try {
                con.query("SELECT * FROM program", function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        
                        con.end();

                        fn(result);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        }
    }
}

module.exports = API;